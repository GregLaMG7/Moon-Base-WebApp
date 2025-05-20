let loadingOverlayElement = null;

function initializeLoadingIndicator() {
    console.log("Attempting to initialize loading indicator...");
    if (document.getElementById('loading-indicator-overlay')) {
        loadingOverlayElement = document.getElementById('loading-indicator-overlay');
        return;
    }

    loadingOverlayElement = document.createElement('div');
    loadingOverlayElement.id = 'loading-indicator-overlay';

    const spinnerContainer = document.createElement('div');
    spinnerContainer.className = 'loading-spinner-container';

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';

    const text = document.createElement('p');
    text.className = 'loading-text';
    text.textContent = 'Анализ участка...';

    spinnerContainer.appendChild(spinner);
    spinnerContainer.appendChild(text);
    loadingOverlayElement.appendChild(spinnerContainer);
    document.body.appendChild(loadingOverlayElement);
}


function showLoadingIndicator(show, message = 'Анализ участка...') {
    if (!loadingOverlayElement) {
        initializeLoadingIndicator();
    }

    if (loadingOverlayElement) { 
        const textElement = loadingOverlayElement.querySelector('.loading-text');
        if (textElement) {
            textElement.textContent = message;
        }

        if (show) {
            loadingOverlayElement.classList.add('visible');
        } else {
            loadingOverlayElement.classList.remove('visible');
        }
    } else {
        console.error("Элемент индикатора загрузки не найден и не может быть создан.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeLoadingIndicator();
});

if (typeof showLoadingIndicator === 'function') {
    showLoadingIndicator(true, "Загрузка карты и данных...");
}