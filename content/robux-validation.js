(function() {
    'use strict';

    function validateRobuxLimits(robuxGive, robuxGet) {
        const MIN_ROBUX = 0;

        if (robuxGive < MIN_ROBUX) {
            Dialogs.alert('Invalid Robux Amount', 'Robux you give cannot be negative.', 'error');
            return false;
        }

        if (robuxGet < MIN_ROBUX) {
            Dialogs.alert('Invalid Robux Amount', 'Robux you want cannot be negative.', 'error');
            return false;
        }

        const selectedInventory = document.querySelectorAll('#inventory-grid .item-card.selected');
        const totalGivingValue = Array.from(selectedInventory).reduce((sum, item) => {
            return sum + (parseInt(item.dataset.value) || 0);
        }, 0);

        const selectedCatalog = document.querySelectorAll('#catalog-grid .item-card[data-quantity]:not([data-quantity="0"])');
        const totalReceivingValue = Array.from(selectedCatalog).reduce((sum, item) => {
            const quantity = parseInt(item.dataset.quantity) || 0;
            const itemValue = parseInt(item.dataset.value) || 0;
            return sum + (itemValue * quantity);
        }, 0);

        if (totalGivingValue > 0 && robuxGive > 0) {
            const maxRobuxGive = totalGivingValue * 0.5;
            if (robuxGive > maxRobuxGive) {
                Dialogs.alert('Invalid Robux Amount', `Robux you give (${robuxGive.toLocaleString()}) cannot exceed 50% of your offering items' total value (${totalGivingValue.toLocaleString()}). Maximum allowed: ${Math.floor(maxRobuxGive).toLocaleString()} Robux.`, 'error');
                return false;
            }
        }

        if (totalReceivingValue > 0 && robuxGet > 0) {
            const maxRobuxGet = totalReceivingValue * 0.5;
            if (robuxGet > maxRobuxGet) {
                Dialogs.alert('Invalid Robux Amount', `Robux you want (${robuxGet.toLocaleString()}) cannot exceed 50% of the receiving items' total value (${totalReceivingValue.toLocaleString()}). Maximum allowed: ${Math.floor(maxRobuxGet).toLocaleString()} Robux.`, 'error');
                return false;
            }
        }

        return true;
    }

    window.validateRobuxLimits = validateRobuxLimits;

})();