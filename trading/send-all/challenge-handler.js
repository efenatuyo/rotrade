(function() {
    'use strict';

    async function waitForChallengeCompletion(maxWaitTime = 120000, shouldStopCheck) {
        const startTime = Date.now();
        const checkInterval = 500;

        while (Date.now() - startTime < maxWaitTime) {
            if (shouldStopCheck && shouldStopCheck()) {
                return false;
            }

            const challengeModal = document.querySelector('.modal-overlay, .modal-container, [class*="challenge"], [class*="verification"]');
            const challengeIframe = document.querySelector('iframe[src*="challenge"], iframe[src*="verification"]');
            const twoStepInput = document.querySelector('#two-step-verification-code-input');
            
            if (!challengeModal && !challengeIframe && !twoStepInput) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return true;
            }

            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }

        return true;
    }

    function isChallengeError(error) {
        const errorMessage = error?.message || String(error || '');
        const errorString = JSON.stringify(error || '');
        
        let statusCode = null;
        if (error?.status) {
            statusCode = error.status;
        } else if (error?.statusCode) {
            statusCode = error.statusCode;
        } else {
            const statusMatch = errorMessage.match(/status[:\s]+(\d+)/i) || errorMessage.match(/HTTP[:\s]+(\d+)/i);
            if (statusMatch) {
                statusCode = parseInt(statusMatch[1], 10);
            }
        }
        
        return statusCode === 403 || 
               errorMessage.includes('Challenge is required') || 
               errorMessage.includes('challenge') ||
               errorString.includes('Challenge is required') ||
               errorString.includes('"code":0');
    }

    window.SendAllChallengeHandler = {
        waitForCompletion: waitForChallengeCompletion,
        isChallengeError: isChallengeError
    };

})();
