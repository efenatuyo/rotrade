(function() {
    'use strict';

    async function loadProofsPage(itemId) {
        const content = `
            <div class="auto-trades-container proofs-container">
                <div class="auto-trades-header" id="proofs-header" style="display: none; text-align: center; margin-bottom: 30px;">
                    <h1 class="auto-trades-title" id="proofs-title" style="text-align: center; font-size: 28px; font-weight: 400; margin-bottom: 8px;"></h1>
                    <div class="proofs-count" id="proofs-count" style="color: var(--auto-trades-text-secondary); font-size: 14px;"></div>
                </div>

                <div id="proofs-loading" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 70vh; text-align: center; padding: 80px 40px; color: var(--auto-trades-text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.6;">📸</div>
                    <div style="font-size: 16px; font-weight: 400;">Loading proofs...</div>
                    <div style="margin-top: 15px; font-size: 14px; opacity: 0.7;">Please wait while we fetch the trade proofs</div>
                </div>

                <div id="proofs-error" style="display: none; text-align: center; padding: 80px 40px; color: #dc3545;">
                    <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.6;">⚠️</div>
                    <div style="font-size: 18px; margin-bottom: 10px; font-weight: 400;">Error loading proofs</div>
                    <div id="proofs-error-message" style="font-size: 14px; opacity: 0.8;"></div>
                </div>

                <div id="proofs-content" style="display: none;">
                    <div class="pagination-controls" id="proofs-pagination" style="width: 100%;">
                        <div class="pagination-info">
                            <span id="proofs-pagination-current">Page 1</span>
                            <span class="pagination-total">of <span id="proofs-pagination-total-pages">1</span></span>
                        </div>
                        <div class="pagination-buttons">
                            <button class="pagination-btn" id="proofs-pagination-prev" disabled>Previous</button>
                            <button class="pagination-btn" id="proofs-pagination-next">Next</button>
                        </div>
                    </div>

                    <div class="proof-display" id="proof-display" style="margin-top: 20px;">
                        <div class="proof-images-container" id="proof-images-container" style="position: relative; display: flex; align-items: center; justify-content: center; min-height: 500px; background: var(--auto-trades-bg-secondary); border-radius: 8px; padding: 20px; max-width: 1200px; margin: 0 auto; box-sizing: border-box;">
                            <button class="proof-image-nav-btn" id="proof-image-prev" style="display: none; position: absolute; left: 10px; background: rgba(0, 0, 0, 0.5); color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-size: 18px; z-index: 10;">←</button>
                            <div id="proof-image-wrapper" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                                <img id="proof-image" style="max-width: 100%; max-height: 600px; border-radius: 4px;" />
                            </div>
                            <button class="proof-image-nav-btn" id="proof-image-next" style="display: none; position: absolute; right: 10px; background: rgba(0, 0, 0, 0.5); color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-size: 18px; z-index: 10;">→</button>
                            <div id="proof-image-counter" style="position: absolute; bottom: 10px; background: rgba(0, 0, 0, 0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; display: none;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        UI.replacePageContent(content);

        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ 
                    action: "fetchProofs", 
                    itemId: itemId 
                }, (response) => {
                    resolve(response);
                });
            });

            if (!response || !response.success) {
                throw new Error(response?.error || 'Failed to fetch proofs');
            }

            const data = response.data;

            document.getElementById('proofs-loading').style.display = 'none';
            document.getElementById('proofs-content').style.display = 'block';
            document.getElementById('proofs-header').style.display = 'block';

            const title = data.item_name && data.acronym 
                ? `Proofs for ${data.item_name} [${data.acronym}]`
                : `Proofs for Item ${itemId}`;
            const titleElement = document.getElementById('proofs-title');
            titleElement.textContent = title;
            titleElement.style.textAlign = 'center';

            const count = data.results ? data.results.length : 0;
            document.getElementById('proofs-count').textContent = `${count} proof${count !== 1 ? 's' : ''} found`;

            if (!data.results || data.results.length === 0) {
                document.getElementById('proofs-content').innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--auto-trades-text-secondary);">
                        No proofs found for this item.
                    </div>
                `;
                return;
            }

            window.proofsData = [...data.results].reverse();
            window.currentProofPage = 1;
            window.currentProofImageIndex = 0;

            function updateProofDisplay() {
                const currentIndex = window.currentProofPage - 1;
                const proof = window.proofsData[currentIndex];

                if (!proof) return;

                const imagesContainer = document.getElementById('proof-images-container');
                const imageWrapper = document.getElementById('proof-image-wrapper');
                const prevBtn = document.getElementById('proof-image-prev');
                const nextBtn = document.getElementById('proof-image-next');
                const counter = document.getElementById('proof-image-counter');

                const attachments = proof.attachments || [];
                window.currentProofAttachments = attachments;
                window.currentProofImageIndex = 0;

                const img = document.getElementById('proof-image');
                let noImageMsg = imageWrapper.querySelector('.no-image-message');
                
                if (attachments.length === 0) {
                    if (img) img.style.display = 'none';
                    if (!noImageMsg) {
                        noImageMsg = document.createElement('div');
                        noImageMsg.className = 'no-image-message';
                        noImageMsg.style.cssText = 'color: var(--auto-trades-text-secondary);';
                        noImageMsg.textContent = 'No image available';
                        imageWrapper.appendChild(noImageMsg);
                    }
                    noImageMsg.style.display = 'block';
                    prevBtn.style.display = 'none';
                    nextBtn.style.display = 'none';
                    counter.style.display = 'none';
                } else {
                    if (noImageMsg) noImageMsg.style.display = 'none';
                    if (img) {
                        img.src = attachments[0];
                        img.style.display = 'block';
                    }
                    prevBtn.style.display = attachments.length > 1 ? 'block' : 'none';
                    nextBtn.style.display = attachments.length > 1 ? 'block' : 'none';
                    counter.style.display = attachments.length > 1 ? 'block' : 'none';
                    counter.textContent = `1 / ${attachments.length}`;
                }
            }

            function updatePagination() {
                const totalPages = window.proofsData.length;
                const currentPage = window.currentProofPage;

                document.getElementById('proofs-pagination-current').textContent = `Page ${currentPage}`;
                document.getElementById('proofs-pagination-total-pages').textContent = totalPages;

                const prevBtn = document.getElementById('proofs-pagination-prev');
                const nextBtn = document.getElementById('proofs-pagination-next');
                prevBtn.disabled = currentPage <= 1;
                nextBtn.disabled = currentPage >= totalPages;
            }

            function navigateImage(direction) {
                const attachments = window.currentProofAttachments || [];
                if (attachments.length <= 1) return;

                if (direction === 'next') {
                    window.currentProofImageIndex = (window.currentProofImageIndex + 1) % attachments.length;
                } else {
                    window.currentProofImageIndex = (window.currentProofImageIndex - 1 + attachments.length) % attachments.length;
                }

                const img = document.getElementById('proof-image');
                const counter = document.getElementById('proof-image-counter');
                img.src = attachments[window.currentProofImageIndex];
                counter.textContent = `${window.currentProofImageIndex + 1} / ${attachments.length}`;
            }

            document.getElementById('proofs-pagination-prev').addEventListener('click', () => {
                if (window.currentProofPage > 1) {
                    window.currentProofPage--;
                    updateProofDisplay();
                    updatePagination();
                }
            });

            document.getElementById('proofs-pagination-next').addEventListener('click', () => {
                if (window.currentProofPage < window.proofsData.length) {
                    window.currentProofPage++;
                    updateProofDisplay();
                    updatePagination();
                }
            });

            document.getElementById('proof-image-prev').addEventListener('click', () => {
                navigateImage('prev');
            });

            document.getElementById('proof-image-next').addEventListener('click', () => {
                navigateImage('next');
            });

            updateProofDisplay();
            updatePagination();

            Utils.nextFrame(() => {
                const paginator = document.getElementById('proofs-pagination');
                const imageContainer = document.getElementById('proof-images-container');
                if (paginator && imageContainer) {
                    const paginatorWidth = paginator.offsetWidth;
                    imageContainer.style.width = `${paginatorWidth}px`;
                }
            });

        } catch (error) {
            console.error('Error loading proofs:', error);
            document.getElementById('proofs-loading').style.display = 'none';
            document.getElementById('proofs-error').style.display = 'block';
            document.getElementById('proofs-error-message').textContent = error.message || 'Failed to load proofs';
        }
    }

    window.PagesProofs = {
        loadProofsPage
    };

    window.loadProofsPage = loadProofsPage;

})();