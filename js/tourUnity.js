function initializeUnityTourControls() {
    const showTourBtn = document.getElementById('show-unity-tour-btn');
    const unityTourWrapper = document.getElementById('unity-tour-wrapper');
    const unityIframe = document.getElementById('unity-iframe');
    const closeTourBtnElement = document.getElementById('close-unity-tour-btn'); 

    const openTour = () => {
        console.log("Открытие 3D тура...");
        unityIframe.src = 'tour/index.html'; 
        unityTourWrapper.classList.add('visible'); 
    };

    const closeTour = () => {
        console.log("Закрытие 3D тура...");
        unityTourWrapper.classList.remove('visible'); 
        
        setTimeout(() => {
            unityIframe.src = ''; 
            console.log("Iframe src сброшен.");
        }, 300); 
    };

    showTourBtn.addEventListener('click', openTour);
    closeTourBtnElement.addEventListener('click', closeTour);

    unityTourWrapper.addEventListener('click', (event) => {
        if (event.target === unityTourWrapper) {
            closeTour();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && unityTourWrapper.classList.contains('visible')) {
            closeTour();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeUnityTourControls();
});