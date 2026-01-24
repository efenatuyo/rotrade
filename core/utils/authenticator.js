(function() {
    'use strict';

    const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    function validateBase32(encoded) {
        if (!encoded || typeof encoded !== 'string') {
            return false;
        }
        const cleaned = encoded.toUpperCase().replace(/=+$/, '');
        if (cleaned.length === 0) {
            return false;
        }
        for (let i = 0; i < cleaned.length; i++) {
            if (BASE32_ALPHABET.indexOf(cleaned[i]) === -1) {
                return false;
            }
        }
        return true;
    }

    function decodeBase32(encoded) {
        if (!validateBase32(encoded)) {
            throw new Error('Invalid base32 format');
        }
        
        const alphabet = BASE32_ALPHABET;
        let input = encoded.toUpperCase().replace(/=+$/, '');
        let bitBuffer = 0, bitCount = 0, byteIndex = 0;
        const output = new Uint8Array((input.length * 5) / 8);
        
        for (let i = 0; i < input.length; i++) {
            const charIndex = alphabet.indexOf(input[i]);
            if (charIndex === -1) {
                throw new Error('Invalid base32 character');
            }
            bitBuffer = (bitBuffer << 5) | charIndex;
            bitCount += 5;
            if (bitCount >= 8) {
                output[byteIndex++] = (bitBuffer >>> (bitCount - 8)) & 0xff;
                bitCount -= 8;
            }
        }
        return output.slice(0, byteIndex);
    }

    function zeroizeUint8Array(arr) {
        if (arr && arr.length > 0) {
            for (let i = 0; i < arr.length; i++) {
                arr[i] = 0;
            }
        }
    }

    function zeroizeString(str) {
        if (str && typeof str === 'string') {
            const arr = new Uint8Array(new TextEncoder().encode(str));
            zeroizeUint8Array(arr);
        }
    }

    function generateTOTP(secret) {
        let keyBytes = null;
        try {
            if (!validateBase32(secret)) {
                return Promise.reject(new Error('Invalid secret format'));
            }
            
            keyBytes = decodeBase32(secret);
            if (!keyBytes || keyBytes.length === 0) {
                return Promise.reject(new Error('Invalid secret format'));
            }
            
            const timeCounter = Math.floor(Date.now() / 1000 / 30);
            const timeBuffer = new ArrayBuffer(8);
            const timeView = new DataView(timeBuffer);
            timeView.setUint32(0, 0, false);
            timeView.setUint32(4, timeCounter, false);
            
            return crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
                .then(key => crypto.subtle.sign('HMAC', key, timeBuffer))
                .then(signature => {
                    const sigBytes = new Uint8Array(signature);
                    const offset = sigBytes[sigBytes.length - 1] & 0xf;
                    const code = ((sigBytes[offset] & 0x7f) << 24) |
                                ((sigBytes[offset + 1] & 0xff) << 16) |
                                ((sigBytes[offset + 2] & 0xff) << 8) |
                                (sigBytes[offset + 3] & 0xff);
                    return String(code % 1000000).padStart(6, '0');
                });
        } catch (error) {
            return Promise.reject(new Error('Invalid secret format'));
        } finally {
            if (keyBytes) {
                zeroizeUint8Array(keyBytes);
            }
        }
    }

    async function deriveKeyFromPassword(password, salt) {
        const passwordBytes = new TextEncoder().encode(password);
        
        const baseKey = await crypto.subtle.importKey(
            'raw',
            passwordBytes,
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        const derivedKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 250000,
                hash: 'SHA-512'
            },
            baseKey,
            {
                name: 'AES-GCM',
                length: 256
            },
            false,
            ['encrypt', 'decrypt']
        );

        zeroizeUint8Array(passwordBytes);
        
        return derivedKey;
    }

    async function encryptSecret(secret, userId, password) {
        if (!secret || !userId || !password) throw new Error('Invalid parameters');
        
        let secretBytes = null;
        try {
            const salt = crypto.getRandomValues(new Uint8Array(32));
            const key = await deriveKeyFromPassword(password, salt);
            const encoder = new TextEncoder();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            secretBytes = encoder.encode(secret);
            
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv, tagLength: 128 },
                key,
                secretBytes
            );
            
            const encryptedBytes = new Uint8Array(encrypted);
            const dataToStore = {
                salt: Array.from(salt),
                iv: Array.from(iv),
                ciphertext: Array.from(encryptedBytes)
            };
            
            zeroizeUint8Array(salt);
            
            return JSON.stringify(dataToStore);
        } catch (error) {
            throw new Error('Encryption failed');
        } finally {
            if (secretBytes) {
                zeroizeUint8Array(secretBytes);
            }
        }
    }

    async function decryptSecret(encryptedData, userId, password) {
        if (!encryptedData || !userId || !password) throw new Error('Invalid parameters');
        
        let decryptedBytes = null;
        try {
            let dataObj;
            try {
                dataObj = JSON.parse(encryptedData);
            } catch {
                throw new Error('Invalid data format');
            }
            
            if (!dataObj.salt || !dataObj.iv || !dataObj.ciphertext) {
                throw new Error('Invalid data structure');
            }
            
            const salt = new Uint8Array(dataObj.salt);
            const iv = new Uint8Array(dataObj.iv);
            const ciphertext = new Uint8Array(dataObj.ciphertext);
            
            const key = await deriveKeyFromPassword(password, salt);
            
            decryptedBytes = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv, tagLength: 128 },
                key,
                ciphertext
            );
            
            const decrypted = new TextDecoder().decode(decryptedBytes);
            zeroizeUint8Array(new Uint8Array(decryptedBytes));
            
            return decrypted;
        } catch (error) {
            if (error.message && error.message.includes('decrypt')) {
                throw new Error('Decryption failed: Invalid password or corrupted data');
            }
            throw new Error('Decryption failed');
        } finally {
            if (decryptedBytes) {
                zeroizeUint8Array(new Uint8Array(decryptedBytes));
            }
        }
    }

    async function storeSecret(secret, userId, password) {
        if (!secret || !userId || !password) throw new Error('Invalid parameters');
        
        try {
            if (!validateBase32(secret)) {
                throw new Error('Invalid secret format');
            }
            
            if (!window.ExtensionStorage) {
                throw new Error('ExtensionStorage not available');
            }
            
            const encrypted = await encryptSecret(secret, userId, password);
            const storageKey = '2fa_secret_' + userId;
            
            await window.Storage.set(storageKey, encrypted);
            return true;
        } catch (error) {
            throw new Error('Storage failed: ' + error.message);
        }
    }

    async function retrieveSecret(userId, password) {
        if (!userId || !password) throw new Error('User ID and password required');
        
        const storageKey = '2fa_secret_' + userId;
        
        if (!window.ExtensionStorage) {
            throw new Error('ExtensionStorage not available');
        }
        
        const encrypted = await window.Storage.get(storageKey, null);
        if (!encrypted) return null;
        
        try {
            return await decryptSecret(encrypted, userId, password);
        } catch (error) {
            throw error;
        }
    }

    async function clearSecret(userId) {
        if (!userId) return;
        const storageKey = '2fa_secret_' + userId;
        
        if (window.ExtensionStorage) {
            await window.Storage.remove(storageKey);
        }
    }

    function clearAllKeys() {
    }

    async function verifyChallenge(userId, challengeId, code) {
        try {
            const csrfToken = await BridgeUtils.getRobloxCSRFToken();
            if (!csrfToken) {
                return { success: false, expired: false, error: 'CSRF token failed' };
            }
            
            const url = `https://twostepverification.roblox.com/v1/users/${userId}/challenges/authenticator/verify`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({
                    challengeId: challengeId,
                    actionType: 'Generic',
                    code: code
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 429) {
                    const retryAfter = response.headers.get('retry-after');
                    let waitTime = 5000;
                    if (retryAfter) {
                        const parsed = parseInt(retryAfter, 10);
                        if (!isNaN(parsed) && parsed > 0) {
                            waitTime = parsed * 1000;
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    return { success: false, expired: false, error: 'Rate limit exceeded' };
                }
                if (data.errors && data.errors[0] && data.errors[0].code === 10) {
                    return { success: false, expired: true, error: data.errors[0].message };
                }
                return { success: false, expired: false, error: data.errors?.[0]?.message || 'Verification failed' };
            }
            
            return { success: true, verificationToken: data.verificationToken || null };
        } catch (error) {
            return { success: false, expired: false, error: error.message };
        }
    }

    async function handleChallenge(userId, challengeId, password) {
        let secret = null;
        try {
            if (!password) {
                return { success: false, error: 'Password required' };
            }
            secret = await retrieveSecret(userId, password);
            if (!secret) return { success: false, error: 'No secret configured' };
            
            const totpCode = await generateTOTP(secret);
            return await verifyChallenge(userId, challengeId, totpCode);
        } catch (error) {
            if (error.message && (error.message.includes('Invalid password') || error.message.includes('Decryption failed'))) {
                return { success: false, error: 'Invalid password', invalidPassword: true };
            }
            return { success: false, error: error.message };
        } finally {
            if (secret) {
                zeroizeString(secret);
            }
        }
    }

    window.addEventListener('beforeunload', () => {
        clearAllKeys();
    });

    window.Authenticator = {
        generateTOTP: generateTOTP,
        storeSecret: storeSecret,
        retrieveSecret: retrieveSecret,
        clearSecret: clearSecret,
        verifyChallenge: verifyChallenge,
        handleChallenge: handleChallenge,
        encryptSecret: encryptSecret,
        decryptSecret: decryptSecret,
        clearAllKeys: clearAllKeys
    };

})();
