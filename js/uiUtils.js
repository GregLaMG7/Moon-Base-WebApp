function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img); 
        img.onerror = (err) => {
            console.error(`Ошибка предзагрузки изображения: ${src}`, err);
            reject(new Error(`Failed to preload image ${src}`));
        };
        img.src = src;
    });
}



function resetWizardState() {
    console.log("Сброс состояния визарда...");
    selectedObjectType = null; // Сбрасываем выбранный тип объекта

    // Снимаем выделение с элементов выбора объекта
    const objectItems = document.querySelectorAll('.tabs-content__object-item');
    objectItems.forEach(i => i.classList.remove('selected'));

    // Блокируем кнопки перехода в визарде
    const gotoStep2Btn = document.getElementById('goto-step2-btn');
    if (gotoStep2Btn) gotoStep2Btn.disabled = true;
    
    const gotoStep3Btn = document.getElementById('goto-step3-btn'); // Кнопка "Перейти к настройкам расположения" на Шаге 2
    if (gotoStep3Btn) gotoStep3Btn.disabled = true;

    // Блокируем таб "Шаг 3. Расположение"
    const tab3 = document.getElementById('tab-3');
    if (tab3) tab3.disabled = true;

    // Очищаем панель параметров на Шаге 2 (если нужно)
    const parametersContainer = document.querySelector('#step-2-content .tabs-setting__set-list');
    if (parametersContainer) parametersContainer.innerHTML = '<p>Выберите тип объекта на Шаге 1 для настройки параметров.</p>';
    const step2TitleSpan = document.querySelector('#step-2-content .tabs-content__tab-title span');
    if (step2TitleSpan) step2TitleSpan.textContent = ""; // Очищаем заголовок на шаге 2
    const step2Image = document.querySelector('#step-2-content .tabs-content__modul-img img');
    if (step2Image) step2Image.src = "images/module_default.png";

    const objectCategoryTitles = document.querySelectorAll('#step-1-content .tabs-content__object-title');
    objectCategoryTitles.forEach(titleElement => {
        titleElement.classList.remove('is-expanded'); // Убираем класс с заголовка (для стрелки)
        const listToToggle = titleElement.nextElementSibling;
        if (listToToggle && listToToggle.classList.contains('tabs-content__object-list')) {
            listToToggle.classList.remove('is-expanded'); // Убираем класс со списка
        }
    });

    const settingsTitleStep2 = document.querySelector('#step-2-content .tabs-content__settings-title');
    if (settingsTitleStep2) {
        settingsTitleStep2.classList.remove('is-expanded');
        const listToToggleStep2 = settingsTitleStep2.nextElementSibling;
        if (listToToggleStep2 && listToToggleStep2.classList.contains('tabs-setting__set-list')) {
            listToToggleStep2.classList.remove('is-expanded');
        }
    }
}



