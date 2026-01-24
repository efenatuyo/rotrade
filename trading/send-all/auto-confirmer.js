(function() {
    'use strict';

    const failureTracker = new Map();
    const MAX_FAILURES = 2;
    const inMemoryPasswords = new Map();
    
    function zeroizeString(str) {
        if (str && typeof str === 'string') {
            const arr = new Uint8Array(new TextEncoder().encode(str));
            for (let i = 0; i < arr.length; i++) {
                arr[i] = 0;
            }
        }
    }
    
    function getPassword(userId) {
        return inMemoryPasswords.get(String(userId)) || null;
    }
    
    function setPassword(userId, password) {
        inMemoryPasswords.set(String(userId), password);
        setTimeout(() => {
            const pwd = inMemoryPasswords.get(String(userId));
            if (pwd) {
                zeroizeString(pwd);
                inMemoryPasswords.delete(String(userId));
            }
        }, 30 * 60 * 1000);
    }
    
    function clearPassword(userId) {
        const pwd = inMemoryPasswords.get(String(userId));
        if (pwd) {
            zeroizeString(pwd);
        }
        inMemoryPasswords.delete(String(userId));
    }
    
    function clearAllPasswords() {
        for (const [userId, pwd] of inMemoryPasswords) {
            zeroizeString(pwd);
        }
        inMemoryPasswords.clear();
    }
    
    window.addEventListener('beforeunload', () => {
        clearAllPasswords();
    });

    function getTradeKey(opportunity) {
        return `${opportunity.id}_${opportunity.targetUserId}`;
    }

    function resetFailureCount(opportunity) {
        const key = getTradeKey(opportunity);
        failureTracker.delete(key);
    }

    function incrementFailureCount(opportunity) {
        const key = getTradeKey(opportunity);
        const count = failureTracker.get(key) || 0;
        failureTracker.set(key, count + 1);
        return count + 1;
    }

    function shouldUseFallback(opportunity) {
        const key = getTradeKey(opportunity);
        const failures = failureTracker.get(key) || 0;
        return failures >= MAX_FAILURES;
    }

    function getHeaderValue(responseHeaders, headerNames) {
        if (!responseHeaders) return null;
        
        for (const headerName of headerNames) {
            let headerValue = null;
            
            if (responseHeaders.get) {
                headerValue = responseHeaders.get(headerName) || 
                             responseHeaders.get(headerName.toLowerCase()) ||
                             responseHeaders.get(headerName.toUpperCase());
            } else {
                headerValue = responseHeaders[headerName] || 
                             responseHeaders[headerName.toLowerCase()] ||
                             responseHeaders[headerName.toUpperCase()];
            }
            
            if (headerValue) {
                return headerValue;
            }
        }
        return null;
    }

    function extractChallengeMetadata(responseHeaders) {
        try {
            const headerValue = getHeaderValue(responseHeaders, [
                'rblx-challenge-metadata',
                'Rblx-Challenge-Metadata',
                'x-rblx-challenge-metadata',
                'X-Rblx-Challenge-Metadata'
            ]);
            
            if (headerValue) {
                const decoded = atob(headerValue);
                const metadata = JSON.parse(decoded);
                return metadata;
            }
        } catch (e) {
        }
        return null;
    }

    function extractChallengeId(responseHeaders) {
        try {
            const headerValue = getHeaderValue(responseHeaders, [
                'rblx-challenge-id',
                'Rblx-Challenge-Id',
                'x-rblx-challenge-id',
                'X-Rblx-Challenge-Id'
            ]);
            
            if (headerValue) {
                return headerValue;
            }
        } catch (e) {
        }
        return null;
    }

    async function sendTradeViaAPI(opportunity, currentUserId, ourInstanceIds, theirInstanceIds) {
        try {
            const csrfToken = await BridgeUtils.getRobloxCSRFToken();
            if (!csrfToken) {
                throw new Error('Failed to get CSRF token');
            }

            const payload = {
                senderOffer: {
                    userId: currentUserId,
                    robux: opportunity.robuxGive || 0,
                    collectibleItemInstanceIds: ourInstanceIds
                },
                recipientOffer: {
                    userId: opportunity.targetUserId,
                    robux: opportunity.robuxGet || 0,
                    collectibleItemInstanceIds: theirInstanceIds
                }
            };

            const response = await fetch(`https://trades.roblox.com/v2/trades/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 429) {
                    const retryAfter = response.headers.get('retry-after') || response.headers.get('Retry-After');
                    let waitTime = 5000;
                    if (retryAfter) {
                        const parsed = parseInt(retryAfter, 10);
                        if (!isNaN(parsed) && parsed > 0) {
                            waitTime = parsed * 1000;
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    throw new Error('Rate limit exceeded');
                }

                const errors = data.errors || [];
                const hasChallengeError = errors.some(e => 
                    (e.code === 0 && e.message && e.message.includes('Challenge is required'))
                );
                
                const hasPrivacyError = errors.some(e => e.code === 22);
                
                if (hasChallengeError) {
                    const challengeMetadata = extractChallengeMetadata(response.headers);
                    const challengeId = extractChallengeId(response.headers);
                    
                    return { 
                        success: false, 
                        challengeRequired: true, 
                        challengeId: challengeMetadata?.challengeId || null,
                        challengeIdHeader: challengeId,
                        challengeMetadata: challengeMetadata,
                        error: data
                    };
                }
                
                if (hasPrivacyError) {
                    const userId = opportunity.targetUserId;
                    if (!window.privacyRestrictedUsers) {
                        const stored = Storage.getAccount('privacyRestrictedUsers', []);
                        window.privacyRestrictedUsers = new Set(stored.map(id => String(id)));
                    }
                    window.privacyRestrictedUsers.add(String(userId));
                    Storage.setAccount('privacyRestrictedUsers', Array.from(window.privacyRestrictedUsers).map(id => String(id)));
                    Storage.flush();
                    
                    window.currentOpportunities = (window.currentOpportunities || []).filter(
                        opp => String(opp.targetUserId) !== String(userId)
                    );
                    window.filteredOpportunities = (window.filteredOpportunities || []).filter(
                        opp => String(opp.targetUserId) !== String(userId)
                    );
                    
                    return { 
                        success: false, 
                        challengeRequired: false, 
                        error: 'User privacy settings prevent trading',
                        errorData: data,
                        privacyRestricted: true
                    };
                }
                
                const errorMessage = errors[0]?.message || 'Trade send failed';
                return { 
                    success: false, 
                    challengeRequired: false, 
                    error: errorMessage,
                    errorData: data
                };
            }

            const tradeId = data.id || data.tradeId;
            if (tradeId) {
                resetFailureCount(opportunity);
                return { success: true, tradeId: tradeId };
            }

            return { 
                success: false, 
                challengeRequired: false, 
                error: 'No trade ID in response'
            };
        } catch (error) {
            return { 
                success: false, 
                challengeRequired: false, 
                error: error.message || 'Trade send failed'
            };
        }
    }

    async function continueChallenge(challengeIdHeader, verificationToken, challengeIdFromMetadata) {
        try {
            const csrfToken = await BridgeUtils.getRobloxCSRFToken();
            if (!csrfToken) {
                throw new Error('Failed to get CSRF token');
            }

            const challengeMetadata = JSON.stringify({
                verificationToken: verificationToken,
                rememberDevice: false,
                challengeId: challengeIdFromMetadata,
                actionType: 'Generic'
            });

            const payload = {
                challengeId: challengeIdHeader,
                challengeType: 'twostepverification',
                challengeMetadata: challengeMetadata
            };

            const response = await fetch('https://apis.roblox.com/challenge/v1/continue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 429) {
                    const retryAfter = response.headers.get('retry-after') || response.headers.get('Retry-After');
                    let waitTime = 5000;
                    if (retryAfter) {
                        const parsed = parseInt(retryAfter, 10);
                        if (!isNaN(parsed) && parsed > 0) {
                            waitTime = parsed * 1000;
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    throw new Error('Rate limit exceeded');
                }
                return { success: false, error: data.errors?.[0]?.message || 'Continue challenge failed' };
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async function handleChallengeWithAutoConfirmer(userId, challengeId, challengeIdHeader, opportunity, ourInstanceIds, theirInstanceIds) {
        try {
            if (!challengeId) {
                incrementFailureCount(opportunity);
                return { success: false, error: 'Challenge ID not provided' };
            }

            if (!challengeIdHeader) {
                incrementFailureCount(opportunity);
                return { success: false, error: 'Challenge ID header not provided' };
            }

            let password = getPassword(userId);
            if (!password) {
                return { success: false, error: 'Password required', useFallback: true };
            }

            for (let attempt = 0; attempt < 3; attempt++) {
                let result = await Authenticator.handleChallenge(userId, challengeId, password);
                
                if (result.invalidPassword) {
                    clearPassword(userId);
                    let retryCount = 0;
                    while (retryCount < 3) {
                        password = await window.Dialogs2FA.showPasswordPrompt(
                            'Incorrect Password',
                            'The password you entered is incorrect. Please try again.',
                            true
                        );
                        if (!password) {
                            return { success: false, error: 'Password required', useFallback: true };
                        }
                        try {
                            const testSecret = await Authenticator.retrieveSecret(userId, password);
                            if (testSecret && testSecret.trim().length > 0) {
                                setPassword(userId, password);
                                result = await Authenticator.handleChallenge(userId, challengeId, password);
                                break;
                            }
                        } catch (e) {
                            retryCount++;
                            if (retryCount >= 3) {
                                return { success: false, error: 'Invalid password', useFallback: true };
                            }
                        }
                    }
                }
                
                if (result.success && result.verificationToken) {
                    const continueResult = await continueChallenge(challengeIdHeader, result.verificationToken, challengeId);
                    
                    if (continueResult.success) {
                        const retryResult = await sendTradeViaAPI(opportunity, userId, ourInstanceIds, theirInstanceIds);
                        
                        if (retryResult.success) {
                            resetFailureCount(opportunity);
                            const storageKey = `2fa_secret_invalid_${userId}`;
                            await Storage.remove(storageKey);
                            if (window.update2FAStatus) {
                                await window.update2FAStatus(false, true);
                            }
                            return { success: true, tradeId: retryResult.tradeId };
                        }
                        
                        if (retryResult.challengeRequired) {
                            if (attempt < 2) {
                                continue;
                            }
                        } else {
                            resetFailureCount(opportunity);
                            return { success: false, error: retryResult.error || 'Trade send failed after challenge' };
                        }
                    }
                    
                    if (attempt < 2) {
                        continue;
                    }
                }
                
                if (result.expired) {
                    if (window.ExtensionStorage) {
                        const storageKey = '2fa_secret_' + userId;
                        const encrypted = await window.Storage.get(storageKey, null);
                        const hasSecret = !!(encrypted && encrypted.trim().length > 0);
                        
                        if (hasSecret) {
                            await Trades.clearAutoConfirmerSecret(userId);
                            clearPassword(userId);
                            
                            if (window.update2FAStatus) {
                                window.update2FAStatus(true);
                            }
                            
                            if (window.Dialogs) {
                                await Dialogs.alert(
                                    '2FA Secret Invalid', 
                                    'Your 2FA secret has expired or is invalid. The secret has been cleared. Please set a new secret in settings.',
                                    'error'
                                );
                            }
                        }
                    }
                    return { success: false, expired: true, error: 'Secret expired' };
                }
                
                if (attempt < 2) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            incrementFailureCount(opportunity);
            return { success: false, error: 'Failed to verify challenge' };
        } catch (error) {
            incrementFailureCount(opportunity);
            return { success: false, error: error.message };
        }
    }

    async function sendTradeWithAutoConfirmer(opportunity, currentUserId, ourInstanceIds, theirInstanceIds, onStatusUpdate) {
        try {
            const userId = currentUserId || (API.getCurrentUserIdSync ? API.getCurrentUserIdSync() : (await API.getCurrentUserId()));
            if (!userId) {
                return { useFallback: true };
            }

            if (!window.ExtensionStorage) {
                return { useFallback: true };
            }
            
            const storageKey = '2fa_secret_' + userId;
            const encrypted = await window.ExtensionStorage.get(storageKey, null);
            const hasSecret = !!(encrypted && encrypted.trim().length > 0);
            
            if (!hasSecret) {
                return { useFallback: true };
            }

            let password = getPassword(userId);
            if (!password) {
                return { useFallback: true };
            }

            let secretValid = false;
            try {
                const secret = await Authenticator.retrieveSecret(userId, password);
                secretValid = !!(secret && secret.trim().length > 0);
            } catch (error) {
                if (error.message && error.message.includes('Invalid password')) {
                    clearPassword(userId);
                    let retryCount = 0;
                    while (retryCount < 3) {
                        password = await window.Dialogs2FA.showPasswordPrompt(
                            'Incorrect Password',
                            'The password you entered is incorrect. Please try again.',
                            true
                        );
                        if (!password) {
                            return { useFallback: true };
                        }
                        try {
                            const secret = await Authenticator.retrieveSecret(userId, password);
                            if (secret && secret.trim().length > 0) {
                                setPassword(userId, password);
                                secretValid = true;
                                break;
                            }
                        } catch (e) {
                            retryCount++;
                            if (retryCount >= 3) {
                                return { useFallback: true };
                            }
                        }
                    }
                } else {
                    secretValid = false;
                }
            }
            
            if (!secretValid) {
                return { useFallback: true };
            }

            if (shouldUseFallback(opportunity)) {
                return { useFallback: true };
            }

            if (onStatusUpdate) {
                onStatusUpdate(3, 3, `Sending trade via API...`, 'pending');
            }

            const apiResult = await sendTradeViaAPI(opportunity, userId, ourInstanceIds, theirInstanceIds);

            if (apiResult.success) {
                const storageKey = `2fa_secret_invalid_${userId}`;
                await Storage.remove(storageKey);
                if (window.update2FAStatus) {
                    await window.update2FAStatus(false, true);
                }
                return { success: true, tradeId: apiResult.tradeId };
            }

            if (!apiResult.challengeRequired) {
                return { success: false, error: apiResult.error, noFallback: true };
            }

            if (apiResult.challengeRequired) {
                if (onStatusUpdate) {
                    onStatusUpdate(3, 3, `Handling 2FA challenge automatically...`, 'pending');
                }

                const challengeResult = await handleChallengeWithAutoConfirmer(
                    userId, 
                    apiResult.challengeId, 
                    apiResult.challengeIdHeader,
                    opportunity,
                    ourInstanceIds,
                    theirInstanceIds
                );

                if (challengeResult.expired) {
                    return { useFallback: true, expired: true };
                }

                if (challengeResult.success && challengeResult.tradeId) {
                    const storageKey = `2fa_secret_invalid_${userId}`;
                    await Storage.remove(storageKey);
                    if (window.update2FAStatus) {
                        await window.update2FAStatus(false, true);
                    }
                    return { success: true, tradeId: challengeResult.tradeId };
                }
                
                if (challengeResult.success && !challengeResult.tradeId) {
                    const retryResult = await sendTradeViaAPI(opportunity, userId, ourInstanceIds, theirInstanceIds);
                    
                    if (retryResult.success) {
                        const storageKey = `2fa_secret_invalid_${userId}`;
                        await Storage.remove(storageKey);
                        if (window.update2FAStatus) {
                            await window.update2FAStatus(false, true);
                        }
                        return { success: true, tradeId: retryResult.tradeId };
                    }
                    
                    if (retryResult.challengeRequired) {
                        const secondChallengeResult = await handleChallengeWithAutoConfirmer(
                            userId, 
                            retryResult.challengeId || apiResult.challengeId, 
                            retryResult.challengeIdHeader || apiResult.challengeIdHeader,
                            opportunity,
                            ourInstanceIds,
                            theirInstanceIds
                        );
                        if (secondChallengeResult.success && secondChallengeResult.tradeId) {
                            return { success: true, tradeId: secondChallengeResult.tradeId };
                        }
                    }
                    
                    incrementFailureCount(opportunity);
                    return { useFallback: true };
                } else {
                    incrementFailureCount(opportunity);
                    if (shouldUseFallback(opportunity)) {
                        return { useFallback: true };
                    }
                }
            }

            return { useFallback: true };
        } catch (error) {
            return { useFallback: true, error: error.message };
        }
    }

    window.AutoConfirmer = {
        sendTradeWithAutoConfirmer,
        resetFailureCount,
        shouldUseFallback,
        setPassword,
        getPassword,
        clearPassword
    };

})();
