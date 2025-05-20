// main.js

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let objectParametersConfig = {}; 
let selectedObjectType = null;   
// let lastClickedLngLat = null; 
let lastClickedWGS84 = null;    
let lastClickedLunar = null; 
let placedObjects = [];          
let mapInstance = null;          
let objectCounter = 0;

// Словари 
const objectDisplayNames = {
  'residential_module_individual': 'Жилой модуль (индивидуальный)',
  'residential_module_shared': 'Жилой модуль (общий)',
  'sports_module': 'Спортивный модуль',
  'administrative_module': 'Административный модуль',
  'medical_module': 'Медицинский модуль',
  'repair_module': 'Ремонтный модуль (мастерская)',
  'spaceport_landing_pad': 'Космодром (посадочная площадка)',
  'communication_tower': 'Вышка связи',
  'plantation_greenhouse': 'Плантация (теплица)',
  'waste_disposal_site': 'Мусорный полигон/Переработка',
  'production_facility': 'Производственное предприятие',
  'solar_power_plant': 'Солнечная электростанция',
  'mining_shaft': 'Добывающая шахта',
  'science_laboratory': 'Научная лаборатория',
  'observatory': 'Обсерватория'
};

const objectDisplayTypes = {
  'default_object_config': 'Стандартный',

  // Обитаемые
  'residential_module_individual': 'Жилой модуль',
  'residential_module_shared': 'Жилой модуль',
  'sports_module': 'Спортивный модуль',
  'administrative_module': 'Административный модуль',
  'medical_module': 'Медицинский модуль',

  // Технологические
  'repair_module': 'Ремонтно-технический',
  'spaceport_landing_pad': 'Космодром',
  'communication_tower': 'Связь',
  'plantation_greenhouse': 'Жизнеобеспечение (Растения)',
  'waste_disposal_site': 'Утилизация отходов',
  'production_facility': 'Производство',
  'solar_power_plant': 'Энергетика (Солнечная)',
  'mining_shaft': 'Добыча ресурсов',

  // Научные
  'science_laboratory': 'Научная лаборатория',
  'observatory': 'Обсерватория'
};


// --- ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadObjectParametersConfig(); // Загружаем конфигурацию объектов
    initializePanelState();             // Начальное состояние инфо-панели
    initializeMap();                    // Инициализация карты
    initializeUIEventListeners();       // Инициализация всех обработчиков UI
    initializeWizard();                 // Инициализация логики визарда (табов)
    initializeHelpModal();
});

async function loadObjectParametersConfig() {
    try {
        const response = await fetch('../data/object_parameters.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        objectParametersConfig = await response.json();
        console.log("Конфигурация параметров объектов загружена:", objectParametersConfig);
    } catch (error) {
        console.error("Не удалось загрузить конфигурацию параметров объектов:", error);
        // Можно отобразить ошибку пользователю или использовать дефолтные параметры
    }
}


function initializeMap() {
    if (typeof initializeMapLibreMap === 'function') {
        mapInstance = initializeMapLibreMap(); // Функция из mapMoon.js
        if (mapInstance) {
            console.log("Экземпляр карты создан и доступен в main.js");
        } else {
            console.error("Не удалось инициализировать карту!");
        }
    } else {
        console.error("Функция initializeMapLibreMap не найдена (mapMoon.js не загружен?)");
    }
}



// Сброс панелей менеджера
function resetResourceDisplayPanel() {
    const resourceContainer = document.querySelector('#selected-module-info-panel .resource-distribution');
    const detailsContentPanel = document.getElementById('module-details-content'); // Панель с основными деталями
    const selectPromptMessage = document.getElementById('select-module-prompt');   // Сообщение "Выберите модуль"

    if (resourceContainer) {
        resourceContainer.innerHTML = '<h3>Распределение ресурсов</h3><p style="color: #888; padding-top: 10px;">Выберите модуль из списка, чтобы увидеть его ресурсные показатели.</p>';
    }

    // Также скроем детали объекта и покажем общее приглашение
    if (detailsContentPanel) detailsContentPanel.style.display = 'none';
    if (selectPromptMessage) {
        selectPromptMessage.style.display = 'block';
        selectPromptMessage.textContent = "Выберите модуль слева для просмотра информации.";
    }

    // Снимем выделение со всех карточек модулей, если они были подсвечены
    const allModuleCards = document.querySelectorAll('#placed-modules-container .module-card.selected');
    allModuleCards.forEach(card => card.classList.remove('selected'));
}



// --- ЛОГИКА ОБНОВЛЕНИЯ UI (ИНФОРМАЦИОННЫЕ ПАНЕЛИ) ---
function initializePanelState() {
    const suitabilityStatus = document.getElementById('site-suitability-status');
    const suitabilityIcon = document.getElementById('site-suitability-icon');
    const shortReview = document.getElementById('site-short-review');
    const heightDisplay = document.getElementById('site-relief-slope'); // Теперь это высота
    const slopeDisplayText = document.getElementById('site-relief-flatness'); // Теперь это качественный уклон
    const radiationText = document.getElementById('site-radiation-protection');
    const seismicText = document.getElementById('site-safety-seismic');
    const meteorText = document.getElementById('site-safety-meteor');
    const nextButton = document.getElementById('btn-next-stepone');

    if (suitabilityStatus) suitabilityStatus.textContent = 'Участок не выбран';
    if (suitabilityIcon) suitabilityIcon.style.display = 'none';
    if (shortReview) shortReview.textContent = 'Кликните на карту Луны, чтобы выбрать и проанализировать участок.';
    if (heightDisplay) heightDisplay.textContent = 'Высота: -';
    if (slopeDisplayText) slopeDisplayText.textContent = 'Уклон: -';
    if (radiationText) radiationText.textContent = 'Радиация: Н/Д';
    if (seismicText) seismicText.textContent = 'Сейсмическая активность: Н/Д';
    if (meteorText) meteorText.textContent = 'Метеоритная опасность: Н/Д';
    if (nextButton) nextButton.disabled = true;

    const detailsBlock = document.querySelector('.window-global__all-spec');
    const detailsToggle = document.querySelector('.window-global__js-toggle');
    if (detailsBlock && detailsBlock.classList.contains('is-expanded')) {
        detailsToggle?.click();
    }
    // Скрываем панель визарда, показываем инфо-панель
    const infoPanelContent = document.querySelectorAll('.window-global__scroll-content')[0];
    const wizardPanelContent = document.querySelectorAll('.window-global__scroll-content')[1];
    if (infoPanelContent) infoPanelContent.classList.remove('hidden');
    if (wizardPanelContent) wizardPanelContent.classList.add('hidden');
}

function updateInfoPanel(siteData, displayLunarCoords) {
    const suitabilityTextElement = document.getElementById('site-suitability-status');
    const suitabilityIconElement = document.getElementById('site-suitability-icon');
    const shortReviewElement = document.getElementById('site-short-review');
    const heightDisplayElement = document.getElementById('site-relief-slope');
    const slopeDisplayTextElement = document.getElementById('site-relief-flatness');
    const slopeIndicatorElement = slopeDisplayTextElement?.previousElementSibling;
    const radiationTextElement = document.getElementById('site-radiation-protection');
    const radiationIndicatorElement = radiationTextElement?.previousElementSibling;
    const seismicTextElement = document.getElementById('site-safety-seismic');
    const seismicIndicatorElement = seismicTextElement?.previousElementSibling;
    const meteorTextElement = document.getElementById('site-safety-meteor');
    const meteorIndicatorElement = meteorTextElement?.previousElementSibling;
    const nextButton = document.getElementById('btn-next-stepone');

    if (suitabilityTextElement) suitabilityTextElement.textContent = siteData.overallSuitabilityText;
    if (suitabilityIconElement) {
        suitabilityIconElement.src = siteData.statusIcon;
        suitabilityIconElement.style.display = 'inline-block';
    }
    if (shortReviewElement) shortReviewElement.textContent = siteData.detailedDescription;

    if (heightDisplayElement) {
        heightDisplayElement.textContent = siteData.absoluteElevation !== undefined ? `Высота: ${siteData.absoluteElevation} м` : "Высота: Н/Д";
    }
    if (slopeDisplayTextElement) slopeDisplayTextElement.textContent = siteData.relief.slope_display_text;
    if (slopeIndicatorElement) slopeIndicatorElement.setAttribute('data-indicator-color', siteData.relief.flatnessIndicator);
    
    if (radiationTextElement) radiationTextElement.textContent = siteData.radiation.protectionText;
    if (radiationIndicatorElement) radiationIndicatorElement.setAttribute('data-indicator-color', siteData.radiation.indicator);
    
    if (seismicTextElement) seismicTextElement.textContent = siteData.safety.seismicText;
    if (seismicIndicatorElement) seismicIndicatorElement.setAttribute('data-indicator-color', siteData.safety.seismicIndicator);
    if (meteorTextElement) meteorTextElement.textContent = siteData.safety.meteorText;
    if (meteorIndicatorElement) meteorIndicatorElement.setAttribute('data-indicator-color', siteData.safety.meteorIndicator);

    if (nextButton) nextButton.disabled = !siteData.isGenerallySuitable;
}


function updateWizardStep3Coordinates(siteData, displayLunarCoords, originalWGS84ClickCoords) {
    const latDisplay = document.getElementById('coord-lat');
    const lngDisplay = document.getElementById('coord-lng');
    const eleDisplay = document.getElementById('coord-ele');
    const angleDisplay = document.getElementById('coord-angle'); // Отображает уклон
    const placementIndicator = document.getElementById('placement-suitability-indicator');
    const placementText = document.getElementById('placement-suitability-text');
    const placeButton = document.getElementById('place-object-button');

    if (!latDisplay || !lngDisplay || !eleDisplay || !angleDisplay || !placementIndicator || !placementText || !placeButton) {
        console.error("Не найдены все элементы на Шаге 3 визарда!");
        return;
    }

    // Отображаем ЛУННЫЕ координаты пользователю
    latDisplay.textContent = displayLunarCoords.lat !== undefined ? displayLunarCoords.lat.toFixed(4) : 'Н/Д';
    lngDisplay.textContent = displayLunarCoords.lng !== undefined ? displayLunarCoords.lng.toFixed(4) : 'Н/Д';
    
    eleDisplay.textContent = siteData.absoluteElevation !== undefined ? siteData.absoluteElevation : 'Н/Д';
    angleDisplay.textContent = siteData.relief.slope_calculated_value !== undefined && siteData.relief.slope_calculated_value !== null 
                                ? siteData.relief.slope_calculated_value.toFixed(1) 
                                : 'Н/Д';

    // Сохраняем ОБА набора координат для дальнейшего использования
    lastClickedLunar = {lng: displayLunarCoords.lng, lat: displayLunarCoords.lat}; 
    lastClickedWGS84 = {lng: originalWGS84ClickCoords.lng, lat: originalWGS84ClickCoords.lat}; 
    // console.log("Сохранены WGS84 для маркера:", lastClickedWGS84);
    // console.log("Сохранены Лунные для данных:", lastClickedLunar);


    const placementSuitability = siteData.isGenerallySuitable;
    placementIndicator.setAttribute('data-indicator-color', placementSuitability ? 'green-color' : 'red-color');
    
    if (placementSuitability) {
        placementText.textContent = 'Критерии для размещения предварительно соблюдены.';
    } else {
        // Попробуем извлечь причину из detailedDescription, если она там есть
        let reason = "Размещение не рекомендуется.";
        if (siteData.detailedDescription && siteData.detailedDescription.includes('Причины:')) {
            reason = siteData.detailedDescription.split('Причины:')[1].trim();
            if (!reason) reason = "Критические факторы не позволяют размещение.";
        } else if (siteData.absoluteElevation === undefined) {
            reason = "Ошибка определения данных участка.";
        }
        placementText.textContent = reason;
    }

    placeButton.disabled = !placementSuitability;
}


// --- ЛОГИКА ИНТЕРФЕЙСА (аккордеоны, переключатели панелей) ---
function initializeUIEventListeners() {
    // Аккордеон "Детальный анализ"
    const detailsToggleButton = document.querySelector('.window-global__js-toggle');
    const detailsContent = document.querySelector('.window-global__all-spec');
    if (detailsToggleButton && detailsContent) {
        detailsToggleButton.setAttribute('aria-expanded', 'false');
        detailsToggleButton.addEventListener('click', () => {
            const isExpanded = detailsContent.classList.toggle('is-expanded');
            detailsToggleButton.classList.toggle('is-expanded', isExpanded);
            detailsToggleButton.setAttribute('aria-expanded', isExpanded);
        });
    }

    // Аккордеоны в визарде (выбор объекта, параметры)
    document.querySelectorAll('.tabs-content__object-title, .tabs-content__settings-title').forEach(title => {
        const listToToggle = title.nextElementSibling;
        if (listToToggle && (listToToggle.classList.contains('tabs-content__object-list') || listToToggle.classList.contains('tabs-setting__set-list'))) {
            title.addEventListener('click', () => {
                title.classList.toggle('is-expanded');
                listToToggle.classList.toggle('is-expanded');
            });
        }
    });

    // Переход с инфо-панели на визард
    const btnNextStepOne = document.getElementById('btn-next-stepone');
    // Эти переменные нужно будет получить внутри обработчика, если они нужны только там,
    // или оставить здесь, если они используются и в других местах этой функции.
    // Для данного обработчика они нужны только внутри.
    // const infoPanelContentForWizard = document.querySelectorAll('.window-global__scroll-content')[0];
    // const wizardPanelContentForWizard = document.querySelectorAll('.window-global__scroll-content')[1];

    if (btnNextStepOne) { // Проверяем только кнопку, панели получим внутри
        btnNextStepOne.addEventListener('click', () => {
            const infoPanel = document.querySelectorAll('.window-global__scroll-content')[0];
            const wizardPanel = document.querySelectorAll('.window-global__scroll-content')[1];
            if (infoPanel && wizardPanel) {
                infoPanel.classList.add('hidden');
                wizardPanel.classList.remove('hidden');
                const firstWizardTab = document.getElementById('tab-1');
                if (firstWizardTab && typeof activateWizardTab === 'function') {
                    activateWizardTab(firstWizardTab);
                }
            }
        });
    }

    // Переключение между основной панелью и менеджером модулей (ОДИН ОБРАБОТЧИК)
    const toggleModuleManagerBtn = document.getElementById('toggle-module-manager-btn');
    const infoAndWizardPanel = document.getElementById('info-and-wizard-panel'); // Панель с инфо и визардом
    const moduleManagerView = document.getElementById('module-manager-view');   // Панель менеджера

    if (toggleModuleManagerBtn && infoAndWizardPanel && moduleManagerView) {
        toggleModuleManagerBtn.addEventListener('click', () => {
            // Проверяем ТЕКУЩЕЕ состояние видимости менеджера ПЕРЕД изменением
            const isManagerCurrentlyHidden = moduleManagerView.classList.contains('hidden');

            if (isManagerCurrentlyHidden) { // Если менеджер скрыт, значит, мы его показываем
                moduleManagerView.classList.remove('hidden');
                infoAndWizardPanel.classList.add('hidden'); // Скрываем другую панель
                toggleModuleManagerBtn.textContent = "Вернуться к карте";
                
                if (typeof populateModuleList === 'function') {
                    populateModuleList(); 
                }
                if (typeof resetResourceDisplayPanel === 'function') {
                    resetResourceDisplayPanel(); // Сбрасываем панель ресурсов
                } else {
                    console.warn("Функция resetResourceDisplayPanel не найдена!");
                }

            } else { // Если менеджер видим, значит, мы его скрываем
                moduleManagerView.classList.add('hidden');
                infoAndWizardPanel.classList.remove('hidden'); // Показываем другую панель
                toggleModuleManagerBtn.textContent = "Управление модулями";
                if (mapInstance) {
                    setTimeout(() => mapInstance.resize(), 50); // Даем время DOM обновиться
                }
            }
        });
    } else {
        // Логирование, если какие-то из основных элементов для переключения не найдены
        if (!toggleModuleManagerBtn) console.error("Кнопка toggle-module-manager-btn не найдена");
        if (!infoAndWizardPanel) console.error("Панель info-and-wizard-panel не найдена");
        if (!moduleManagerView) console.error("Панель module-manager-view не найдена");
    }
}


// --- ЛОГИКА ВИЗАРДА РАЗМЕЩЕНИЯ ОБЪЕКТОВ ---
let wizardTabs, wizardContentPanels, wizardNextButtons;
let gotoStep2Button, gotoStep3Button, tab3; // Переменные для кнопок и таба 3

function initializeWizard() {
    wizardTabs = document.querySelectorAll('.wizard-tabs__tab');
    wizardContentPanels = document.querySelectorAll('.tabs-content__tab');
    // Кнопки "Далее" внутри каждой панели табов
    const btnGotoStep2 = document.getElementById('goto-step2-btn'); // Шаг 1 -> Шаг 2
    const btnGotoStep3 = document.getElementById('goto-step3-btn'); // Шаг 2 -> Шаг 3
    
    gotoStep2Button = btnGotoStep2; // Для блокировки/разблокировки
    gotoStep3Button = btnGotoStep3; // Для блокировки/разблокировки
    tab3 = document.getElementById('tab-3'); // Таб "Шаг 3. Расположение"

    // Изначально блокируем кнопки перехода и Таб 3
    if (gotoStep2Button) gotoStep2Button.disabled = true;
    if (gotoStep3Button) gotoStep3Button.disabled = true;
    if (tab3) tab3.disabled = true;


    wizardTabs.forEach(tab => {
        tab.addEventListener('click', (event) => {
            if (!event.currentTarget.disabled) { // Разрешаем клик только если таб не заблокирован
                 activateWizardTab(event.currentTarget);
            }
        });
        // ... (обработчик keydown, если нужен) ...
    });

    if (btnGotoStep2) {
        btnGotoStep2.addEventListener('click', () => {
            const nextTab = document.getElementById('tab-2');
            if (nextTab) activateWizardTab(nextTab);
        });
    }
    if (btnGotoStep3) {
        btnGotoStep3.addEventListener('click', () => {
            // const nextTab = document.getElementById('tab-3'); // tab3
            if (tab3) activateWizardTab(tab3); // Переход на Шаг 3
        });
    }
    
    // Инициализация первого таба (если он не должен быть заблокирован)
    const initialActiveTab = document.querySelector('.wizard-tabs__tab.active');
    if (initialActiveTab && !initialActiveTab.disabled) {
        activateWizardTab(initialActiveTab);
    } else if (wizardTabs.length > 0 && !wizardTabs[0].disabled) {
        activateWizardTab(wizardTabs[0]);
    }

    // Выбор типа объекта на Шаге 1
    const objectItems = document.querySelectorAll('.tabs-content__object-item');
    objectItems.forEach(item => {
        item.addEventListener('click', () => {
            objectItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedObjectType = item.dataset.objectType;
            console.log("Выбран объект:", selectedObjectType);
            if (gotoStep2Button) gotoStep2Button.disabled = false; // Разблокируем кнопку на Шаг 2
            if (gotoStep3Button) gotoStep3Button.disabled = true;  // Блокируем кнопку на Шаг 3
            if (tab3) tab3.disabled = true;                     // Блокируем Таб 3
            updateWizardStep2(selectedObjectType);
        });
    });
}

function activateWizardTab(tabToActivate) {
    if (!tabToActivate || tabToActivate.disabled) return;

    const targetPanelId = tabToActivate.getAttribute('aria-controls') || tabToActivate.dataset.targetPanel;
    if (!targetPanelId) return;

    wizardTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
        if (!tab.disabled) tab.setAttribute('tabindex', '-1');
    });
    wizardContentPanels.forEach(panel => panel.classList.remove('active'));

    tabToActivate.classList.add('active');
    tabToActivate.setAttribute('aria-selected', 'true');
    tabToActivate.removeAttribute('tabindex');

    const targetPanel = document.getElementById(targetPanelId);
    if (targetPanel) targetPanel.classList.add('active');

    // Валидация при переходе на Шаг 2
    if (tabToActivate.id === 'tab-2') {
        validateStep2Form(); // Эта функция должна управлять disabled для gotoStep3Button и tab3
    }
}

function updateWizardStep2(objectType) {
    // ... (твой код updateWizardStep2 без изменений) ...
    // ВАЖНО: в конце этой функции, после генерации полей, вызови validateStep2Form()
    // чтобы сразу проверить, валидна ли форма (например, если нет обязательных полей)
    const step2TitleSpan = document.querySelector('#step-2-content .tabs-content__tab-title span');
    const step2Image = document.querySelector('#step-2-content .tabs-content__modul-img img');
    const parametersContainer = document.querySelector('#step-2-content .tabs-setting__set-list');
    // const gotoStep3Button = document.getElementById('goto-step3-btn'); // Уже есть глобально

    if (!step2TitleSpan || !step2Image || !parametersContainer || !gotoStep3Button) return;

    const config = objectParametersConfig[objectType] || objectParametersConfig['default_object_config'];
    if (!config) return;

    step2TitleSpan.textContent = config.displayName;
    step2Image.src = config.image;
    step2Image.alt = config.displayName;
    parametersContainer.innerHTML = ''; 

    if (config.parameters && config.parameters.length > 0) {
        config.parameters.forEach(param => {
            const paramItemDiv = document.createElement('div');
            paramItemDiv.className = 'tabs-settings__set-item';
            const fieldId = `param-${param.id}`;
            const htmlInputType = param.inputType || 'text'; // Помни, ты просил все 'text'
            let validationAttrs = '';
            // Атрибуты min/max для input type="number" не будут работать для type="text" напрямую в HTML,
            // но мы их используем для JS валидации
            if (param.validation) {
                if (param.validation.required) validationAttrs += ' required';
                // if (param.validation.minValue !== undefined) validationAttrs += ` min="${param.validation.minValue}"`;
                // if (param.validation.maxValue !== undefined) validationAttrs += ` max="${param.validation.maxValue}"`;
            }
            const inputHtml = `<input type="${htmlInputType}" class="tabs-settings__input-area" id="${fieldId}" name="${fieldId}" placeholder="${param.placeholder || ''}"${validationAttrs}>`;
            const labelHtml = `<label for="${fieldId}" style="display:block; margin-bottom: 5px; font-weight: 500;">${param.label || param.id}</label>`;
            const descriptionHtml = `<p class="tabs-settings__set-des">${param.description || ''}</p>`;
            const errorHtml = `<p class="validation-error-message" id="error-${fieldId}" style="color: red; font-size: 0.9em; margin-top: 5px; display: none;"></p>`;
            paramItemDiv.innerHTML = `${labelHtml}<div class="tabs-settings__input-wrapper">${inputHtml}</div>${errorHtml}${descriptionHtml}`;
            parametersContainer.appendChild(paramItemDiv);

            const inputElement = document.getElementById(fieldId);
            if (inputElement) {
                inputElement.addEventListener('input', validateStep2Form);
            }
        });
    } else {
        parametersContainer.innerHTML = '<p>Для данного объекта параметры не настраиваются.</p>';
    }
    validateStep2Form(); // Первичная валидация
}

function validateStep2Form() {
    // ... (твой код validateStep2Form) ...
    // ВАЖНО: В конце этой функции добавь управление блокировкой для gotoStep3Button и tab3
    const parametersContainer = document.querySelector('#step-2-content .tabs-setting__set-list');
    // const gotoStep3Button = document.getElementById('goto-step3-btn'); // Уже есть глобально
    // const tab3 = document.getElementById('tab-3'); // Уже есть глобально

    if (!parametersContainer || !gotoStep3Button || !tab3) return;
    let isFormValid = true;
    const currentConfig = objectParametersConfig[selectedObjectType] || objectParametersConfig['default_object_config'];

    if (currentConfig && currentConfig.parameters && currentConfig.parameters.length > 0) {
        currentConfig.parameters.forEach(paramConfig => {
            const inputElement = document.getElementById(`param-${paramConfig.id}`);
            const errorElement = document.getElementById(`error-param-${paramConfig.id}`);
            if (!inputElement) return; 
            let errorMessage = '';
            const value = inputElement.value.trim();
            const validationRules = paramConfig.validation;

            if (validationRules) {
                if (validationRules.required && value === '') {
                    errorMessage = 'Это поле обязательно.'; isFormValid = false;
                }
                if (errorMessage === '' && (value !== '' || validationRules.required)) {
                    // Для inputType="text", но ожидаем число
                    if (validationRules.isNumber) {
                        const numValue = parseFloat(value);
                        if (isNaN(numValue)) {
                            errorMessage = 'Нужно число.'; isFormValid = false;
                        } else {
                            if (validationRules.minValue !== undefined && numValue < validationRules.minValue) {
                                errorMessage = `Мин: ${validationRules.minValue}.`; isFormValid = false;
                            }
                            if (validationRules.maxValue !== undefined && numValue > validationRules.maxValue) {
                                errorMessage = `Макс: ${validationRules.maxValue}.`; isFormValid = false;
                            }
                            if (validationRules.isInteger && !Number.isInteger(numValue)) {
                                errorMessage = 'Нужно целое число.'; isFormValid = false;
                            }
                        }
                    }
                    if (validationRules.allowedValues && !validationRules.allowedValues.includes(value) && value !== '') {
                        errorMessage = `Допустимы: ${validationRules.allowedValues.join(', ')}.`; isFormValid = false;
                    }
                    if (validationRules.pattern && value !== '') {
                        const regex = new RegExp(validationRules.pattern);
                        if (!regex.test(value)) {
                            errorMessage = paramConfig.patternErrorMessage || 'Неверный формат.'; isFormValid = false;
                        }
                    }
                }
            }
            if (errorElement) {
                errorElement.textContent = errorMessage;
                errorElement.style.display = errorMessage ? 'block' : 'none';
            }
        });
    } else { // Нет настраиваемых параметров
        isFormValid = true;
    }

    gotoStep3Button.disabled = !isFormValid;
    tab3.disabled = !isFormValid; // Блокируем/разблокируем Таб 3
    // console.log("Форма Шага 2 валидна:", isFormValid, "Таб 3 заблокирован:", tab3.disabled);
}


// --- ЛОГИКА РАЗМЕЩЕНИЯ ОБЪЕКТОВ ---
function setupObjectPlacement() {
    const placeObjectButton = document.getElementById('place-object-button');
    if (placeObjectButton) {
        placeObjectButton.addEventListener('click', async () => { 
            if (!selectedObjectType) {
                alert("Сначала выберите тип объекта на Шаге 1.");
                return;
            }
            if (!lastClickedWGS84 || lastClickedWGS84.lng === undefined || lastClickedWGS84.lat === undefined) {
                 alert("Ошибка: Координаты WGS84 для размещения маркера не определены. Кликните на карту.");
                 return;
            }
            if (!lastClickedLunar || lastClickedLunar.lng === undefined || lastClickedLunar.lat === undefined) {
                 alert("Ошибка: Лунные координаты для данных объекта не определены.");
                 return; 
            }

            let iconCssClass = 'icon-default'; // CSS класс по умолчанию
            let iconFilenameForPreload = 'default_icon.png'; // Имя файла для предзагрузки

            // Определяем CSS класс и имя файла для предзагрузки
            if (selectedObjectType.includes('residential') || 
                selectedObjectType.includes('sports') || 
                selectedObjectType.includes('administrative') || 
                selectedObjectType.includes('medical_module')) {
                iconCssClass = 'icon-res';
                iconFilenameForPreload = 'res_icon.png';
            } else if (selectedObjectType.includes('repair') || 
                       selectedObjectType.includes('spaceport') || 
                       selectedObjectType.includes('communication') || 
                       selectedObjectType.includes('plantation') || 
                       selectedObjectType.includes('waste') || 
                       selectedObjectType.includes('production') || 
                       selectedObjectType.includes('solar_power_plant') || 
                       selectedObjectType.includes('nuclear_power_plant') || 
                       selectedObjectType.includes('mining_shaft')) {
                iconCssClass = 'icon-tech';
                iconFilenameForPreload = 'tech_icon.png';
            } else if (selectedObjectType.includes('science_lab') || 
                       selectedObjectType.includes('observatory')) {
                iconCssClass = 'icon-science';
                iconFilenameForPreload = 'science_icon.png';
            }
            
            
            const iconUrlToPreload = `../images/icons-map/${iconFilenameForPreload}`; 
            

            console.log(`Размещение: Тип='${selectedObjectType}', CSS-класс='${iconCssClass}', URL предзагрузки='${iconUrlToPreload}'`);
            console.log(`Координаты для маркера (WGS84): Lng=${lastClickedWGS84.lng}, Lat=${lastClickedWGS84.lat}`);

            if (!mapInstance) {
                alert("Ошибка: Экземпляр карты не доступен.");
                return;
            }

            try {
                // 1. Предзагружаем иконку (это больше для того, чтобы она была в кэше браузера)
                await preloadImage(iconUrlToPreload);
                console.log(`Иконка для класса ${iconCssClass} (${iconUrlToPreload}) предзагружена или уже в кэше.`);

                // 2. Создаем элемент маркера
                const el = document.createElement('div');
                // Применяем CSS классы. Размеры и фон будут из CSS.
                el.className = `custom-object-marker ${iconCssClass}`; 
                

                const newMapMarker = new maplibregl.Marker(el) // Передаем div с классами
                    .setLngLat([lastClickedWGS84.lng, lastClickedWGS84.lat])
                    .setPopup(new maplibregl.Popup({ 
                        offset: [0, -20],
                        className: 'custom-lunar-popup'
                    }).setText(objectDisplayNames[selectedObjectType] || selectedObjectType))
                    .addTo(mapInstance);
                
                objectCounter++;
                const newObjectId = `${selectedObjectType}_${objectCounter}`;

                el.addEventListener('click', (event) => {
                    event.stopPropagation(); // ОЧЕНЬ ВАЖНО: останавливаем всплытие события, чтобы не сработал map.on('click')
                    console.log(`Клик по объекту ID: ${newObjectId}`);
                    
                    // Действие при клике на объект:
                    // 1. Показать информацию об этом объекте
                    if (typeof displayModuleInfo === 'function') {
                        displayModuleInfo(newObjectId); // displayModuleInfo должна найти объект по ID в placedObjects
                    }
                    // 2. Переключиться на панель менеджера модулей (если она не активна)
                    const moduleManagerView = document.getElementById('module-manager-view');
                    const infoAndWizardPanel = document.getElementById('info-and-wizard-panel');
                    const toggleModuleManagerBtn = document.getElementById('toggle-module-manager-btn');

                    if (moduleManagerView && moduleManagerView.classList.contains('hidden')) {
                        if(toggleModuleManagerBtn) toggleModuleManagerBtn.click(); // Симулируем клик по кнопке переключения
                    }
                    
                    // 3. Опционально: центрировать карту на этом объекте или подсветить его как-то еще
                    // const clickedObjectData = placedObjects.find(obj => obj.id === newObjectId);
                    // if (clickedObjectData && clickedObjectData.wgs84MarkerLngLat) {
                    //    mapInstance.flyTo({ center: [clickedObjectData.wgs84MarkerLngLat.lng, clickedObjectData.wgs84MarkerLngLat.lat], zoom: mapInstance.getZoom() + 1 });
                    // }
                });

                let objectSpecificParams = {};
                const currentConfig = objectParametersConfig[selectedObjectType];
                if (currentConfig && currentConfig.parameters) {
                    currentConfig.parameters.forEach(param => {
                        const inputElement = document.getElementById(`param-${param.id}`);
                        if (inputElement) objectSpecificParams[param.id] = inputElement.value;
                    });
                }

                placedObjects.push({
                    id: newObjectId, type: selectedObjectType,
                    displayName: objectDisplayNames[selectedObjectType] || selectedObjectType,
                    displayType: objectDisplayTypes[selectedObjectType] || 'Неизвестный тип',
                    lngLat: lastClickedLunar, 
                    wgs84MarkerLngLat: lastClickedWGS84,
                    mapMarkerInstance: newMapMarker, 
                    customParameters: objectSpecificParams
                });
                
                if (typeof populateModuleList === 'function') populateModuleList();
                console.log("Размещен объект:", placedObjects[placedObjects.length - 1]);

                selectedObjectType = null;
                document.querySelectorAll('.tabs-content__object-item.selected').forEach(i => i.classList.remove('selected'));
                const gotoStep2Btn = document.getElementById('goto-step2-btn');
                if(gotoStep2Btn) gotoStep2Btn.disabled = true;
                const gotoStep3Btn = document.getElementById('goto-step3-btn');
                if(gotoStep3Btn) gotoStep3Btn.disabled = true;
                const tab3Elem = document.getElementById('tab-3');
                if(tab3Elem) tab3Elem.disabled = true;

                const infoPanelContent = document.querySelectorAll('.window-global__scroll-content')[0];
                const wizardPanelContent = document.querySelectorAll('.window-global__scroll-content')[1];
                if (wizardPanelContent) wizardPanelContent.classList.add('hidden');
                if (infoPanelContent) infoPanelContent.classList.remove('hidden');
                if (typeof initializePanelState === 'function') initializePanelState(); 
                alert("Объект успешно размещен!");

            } catch (error) {
                console.error(`Не удалось разместить объект с кастомной иконкой (CSS подход):`, error);
                alert(`Ошибка при размещении объекта. Иконка ${iconFilenameForPreload} могла не загрузиться. Будет стандартная метка, если MapLibre ее поставит.`);
                // Fallback на стандартный маркер MapLibre, если очень нужно
                if (mapInstance && lastClickedWGS84) {
                    console.log("Используется стандартный маркер из-за ошибки с кастомной иконкой (CSS).");
                    new maplibregl.Marker() 
                        .setLngLat([lastClickedWGS84.lng, lastClickedWGS84.lat])
                        .setPopup(new maplibregl.Popup({ offset: [0, -20] })
                            .setText(objectDisplayNames[selectedObjectType] || selectedObjectType))
                        .addTo(mapInstance);
                }
            }
        });
    } else {
        console.error("Кнопка #place-object-button не найдена!");
    }
}


// --- ЛОГИКА МЕНЕДЖЕРА МОДУЛЕЙ ---
// В main.js (или где у тебя логика менеджера модулей)

// Глобальные переменные (убедись, что placedObjects, objectDisplayNames, objectDisplayTypes определены ранее)
// let placedObjects = []; // Уже должно быть определено
// const objectDisplayNames = { ... }; // Уже должно быть определено
// const objectDisplayTypes = { ... }; // Уже должно быть определено



function calculateObjectResources(placedObject) {
    const config = objectParametersConfig[placedObject.type];
    const params = placedObject.customParameters; // Параметры, введенные пользователем
    
    // Инициализируем результат нулями
    let calculated = { 
        consumed_energy_kw: 0, 
        produced_energy_kw: 0,
        consumed_water_l_day: 0,
        produced_water_l_day: 0,
        consumed_oxygen_kg_day: 0,
        produced_oxygen_kg_day: 0,
        // Добавь другие ресурсы по мере необходимости
    };

    if (!config || !config.resources || !params) {
        console.warn(`Нет конфигурации ресурсов или пользовательских параметров для ${placedObject.type}`);
        return calculated; // Возвращаем нули, если нет данных
    }

    const resConf = config.resources;
    const capacity = parseInt(params.capacity) || 0; // Вместимость для жилых модулей
    const area_m2 = parseFloat(params.area_m2 || params.cultivation_area_m2 || params.workshop_area_m2 || params.lab_floor_area_total_m2 || params.total_panel_area_m2) || 0; // Общая площадь
    const daily_processing_kg = parseFloat(params.daily_waste_processing_kg) || 0;
    const daily_output_tons_mining = parseFloat(params.daily_raw_material_output_tons) || 0;


    // --- Потребление ---
    if (resConf.consumes) {
        const consumes = resConf.consumes;
        if (consumes.energy_kw_base !== undefined) calculated.consumed_energy_kw += consumes.energy_kw_base;
        if (consumes.energy_kw_per_capita !== undefined && capacity > 0) calculated.consumed_energy_kw += consumes.energy_kw_per_capita * capacity;
        if (consumes.energy_kw_active_use !== undefined) calculated.consumed_energy_kw += consumes.energy_kw_active_use; // Для спорт. модуля, если активен
        if (consumes.energy_kw_workstations_avg !== undefined && params.workstations_count) calculated.consumed_energy_kw += consumes.energy_kw_workstations_avg * parseInt(params.workstations_count);
        if (consumes.energy_kw_servers_base !== undefined) calculated.consumed_energy_kw += consumes.energy_kw_servers_base;
        if (consumes.energy_kw_standby !== undefined) calculated.consumed_energy_kw += consumes.energy_kw_standby;
        if (consumes.energy_kw_tools_avg !== undefined) calculated.consumed_energy_kw += consumes.energy_kw_tools_avg;
        if (consumes.energy_kw_lighting_systems !== undefined) calculated.consumed_energy_kw += consumes.energy_kw_lighting_systems;
        if (consumes.energy_kw_operational !== undefined) calculated.consumed_energy_kw += consumes.energy_kw_operational; // Для мед.модуля, связи, обсерватории
        if (consumes.energy_kw_lab_equipment !== undefined) calculated.consumed_energy_kw += consumes.energy_kw_lab_equipment;
        if (consumes.energy_kw_lighting_per_100m2 !== undefined && area_m2 > 0) calculated.consumed_energy_kw += (area_m2 / 100) * consumes.energy_kw_lighting_per_100m2;
        if (consumes.energy_kw_climate_control_per_100m2 !== undefined && area_m2 > 0) calculated.consumed_energy_kw += (area_m2 / 100) * consumes.energy_kw_climate_control_per_100m2;
        if (consumes.energy_kw_processing_per_100kg !== undefined && daily_processing_kg > 0) calculated.consumed_energy_kw += (daily_processing_kg / 100) * consumes.energy_kw_processing_per_100kg;
        if (consumes.energy_kw_per_ton_extracted !== undefined && daily_output_tons_mining > 0) calculated.consumed_energy_kw += daily_output_tons_mining * consumes.energy_kw_per_ton_extracted;
        
        if (consumes.water_l_day_per_capita !== undefined && capacity > 0) calculated.consumed_water_l_day += consumes.water_l_day_per_capita * capacity;
        if (consumes.water_l_day_technical !== undefined) calculated.consumed_water_l_day += consumes.water_l_day_technical;
        if (consumes.water_l_day_per_100m2 !== undefined && area_m2 > 0) calculated.consumed_water_l_day += (area_m2 / 100) * consumes.water_l_day_per_100m2;

        if (consumes.oxygen_kg_day_per_capita !== undefined && capacity > 0) calculated.consumed_oxygen_kg_day += consumes.oxygen_kg_day_per_capita * capacity;
        if (consumes.oxygen_kg_day_medical !== undefined) calculated.consumed_oxygen_kg_day += consumes.oxygen_kg_day_medical;
    }

    // --- Производство ---
    if (resConf.produces) {
        const produces = resConf.produces;
        // Для солнечной и ядерной станции производство энергии берем из их параметра peak_power_output_kw или power_output_kw
        if (placedObject.type === "solar_power_plant" && params.peak_power_output_kw) {
            calculated.produced_energy_kw += parseFloat(params.peak_power_output_kw) || 0;
        }
        if (placedObject.type === "nuclear_power_plant" && params.power_output_kw) { // Используем power_output_kw из параметров
            calculated.produced_energy_kw += parseFloat(params.power_output_kw) || 0;
        }

        if (produces.grey_water_l_day_per_capita !== undefined && capacity > 0) calculated.produced_water_l_day += produces.grey_water_l_day_per_capita * capacity;
        if (produces.reclaimed_water_l_per_100kg_organic !== undefined && daily_processing_kg > 0) calculated.produced_water_l_day += (daily_processing_kg / 100) * produces.reclaimed_water_l_per_100kg_organic;
        
        if (produces.oxygen_kg_day_per_100m2 !== undefined && area_m2 > 0) calculated.produced_oxygen_kg_day += (area_m2 / 100) * produces.oxygen_kg_day_per_100m2;

        // Для производства (общего) - здесь нужна более сложная логика на основе facility_specialization
        if (placedObject.type === "production_facility" && params.facility_specialization) {
            if (params.facility_specialization.toLowerCase().includes('топливо') && produces.fuel_kg_day) {
                // Предположим, fuel_kg_day это число из JSON (например, из production_output_rate_description)
                // Это очень условно, т.к. fuel_kg_day у нас нет в JSON.
                // calculated.produced_fuel_kg_day = parseFloat(params.production_output_rate_description) || 0; // Пример
            }
        }
    }
    
    // Итоговый баланс для каждого ресурса (производство - потребление)
    calculated.net_energy_kw = calculated.produced_energy_kw - calculated.consumed_energy_kw;
    calculated.net_water_l_day = calculated.produced_water_l_day - calculated.consumed_water_l_day;
    calculated.net_oxygen_kg_day = calculated.produced_oxygen_kg_day - calculated.consumed_oxygen_kg_day;

    return calculated;
}




/**
 * Отображает информацию о выбранном размещенном объекте в панели деталей.
 * @param {string} objectId - ID объекта из массива placedObjects.
 */
function displayModuleInfo(objectId) {
    const detailsContentPanel = document.getElementById('module-details-content');
    const selectPromptMessage = document.getElementById('select-module-prompt');
    const resourceContainer = document.querySelector('#selected-module-info-panel .resource-distribution');

    // Элементы для основной информации
    const nameDisplay = document.getElementById('info-module-name');
    const typeDisplay = document.getElementById('info-module-type');
    const idDisplay = document.getElementById('info-module-id');
    const coordsDisplay = document.getElementById('info-module-coords');
    const statusDisplay = document.getElementById('info-module-status'); // Для общего статуса объекта
    
    // Контейнер для кастомных параметров (созданных пользователем)
    const customParamsContainer = document.getElementById('info-module-custom-params');


    if (!detailsContentPanel || !selectPromptMessage || !nameDisplay || !typeDisplay || 
        !idDisplay || !coordsDisplay || !statusDisplay || !customParamsContainer || !resourceContainer) {
        console.error("Не найдены все необходимые DOM-элементы для displayModuleInfo!");
        if (detailsContentPanel) detailsContentPanel.style.display = 'none';
        if (selectPromptMessage) {
            selectPromptMessage.style.display = 'block';
            selectPromptMessage.textContent = "Ошибка: Проблема с интерфейсом отображения информации.";
        }
        return;
    }

    const selectedObject = placedObjects.find(obj => obj.id === objectId);

    if (!selectedObject) {
        console.warn("В displayModuleInfo не найден объект с ID:", objectId, ". Сброс панели информации.");
        resetResourceDisplayPanel(); 
        return;
    }    

    if (!selectedObject) {
        console.error("В displayModuleInfo не найден объект с ID:", objectId);
        detailsContentPanel.style.display = 'none';
        selectPromptMessage.style.display = 'block';
        selectPromptMessage.textContent = "Ошибка: Выбранный модуль не найден.";
        const allModuleCards = document.querySelectorAll('#placed-modules-container .module-card');
        allModuleCards.forEach(card => card.classList.remove('selected'));
        return;
    }

    console.log("Отображаем информацию для объекта:", selectedObject);

    // 1. Заполнение основной информации об объекте
    nameDisplay.textContent = selectedObject.displayName || 'Имя не указано';
    typeDisplay.textContent = selectedObject.displayType || 'Тип не указан';
    idDisplay.textContent = selectedObject.id;

    if (selectedObject.lngLat) { // Отображаем лунные координаты
        coordsDisplay.textContent = ` ${selectedObject.lngLat.lat.toFixed(4)}, ${selectedObject.lngLat.lng.toFixed(4)} `;
    } else {
        coordsDisplay.textContent = "Координаты не определены";
    }

    // Статус объекта (пока заглушка, можно расширить на основе анализа ресурсов или других факторов)
    statusDisplay.textContent = "Функционирует"; // Пример
    statusDisplay.className = 'info-value status-text status-ok'; // Пример класса

    // 2. Отображение кастомных параметров, введенных пользователем
    customParamsContainer.innerHTML = ''; // Очищаем предыдущие
    if (selectedObject.customParameters && Object.keys(selectedObject.customParameters).length > 0) {
        const objectConfig = objectParametersConfig[selectedObject.type] || objectParametersConfig['default_object_config'];
        
        for (const paramId in selectedObject.customParameters) {
            const paramValue = selectedObject.customParameters[paramId];
            let paramLabel = paramId; 

            if (objectConfig && objectConfig.parameters) {
                const paramDefinition = objectConfig.parameters.find(p => p.id === paramId);
                if (paramDefinition && paramDefinition.label) {
                    paramLabel = paramDefinition.label;
                }
            }

            const paramRow = document.createElement('div');
            paramRow.className = 'info-row'; 
            const labelSpan = document.createElement('span');
            labelSpan.className = 'info-label';
            labelSpan.textContent = `${paramLabel}:`;
            const valueSpan = document.createElement('span');
            valueSpan.className = 'info-value';
            valueSpan.textContent = paramValue || "-"; 
            paramRow.appendChild(labelSpan);
            paramRow.appendChild(valueSpan);
            customParamsContainer.appendChild(paramRow);
        }
    } else {
        const noParamsMsg = document.createElement('p');
        noParamsMsg.textContent = "Дополнительные параметры не заданы.";
        noParamsMsg.style.color = "#888";
        customParamsContainer.appendChild(noParamsMsg);
    }

    // 3. Расчет и отображение ресурсов для выбранного модуля
    const objectResources = calculateObjectResources(selectedObject); // Эта функция должна быть определена
    
    // Очищаем предыдущее содержимое ресурсов в .resource-distribution
    resourceContainer.innerHTML = '<h3>Распределение ресурсов</h3>'; // Восстанавливаем заголовок

    // Энергия
    const energySection = document.createElement('div');
    energySection.className = 'resource-section';
    energySection.innerHTML = `
        <h4>Энергия</h4>
        <div class="resource-row">
            <span class="resource-label">Баланс (объекта)</span>
            <span class="resource-value">${objectResources.net_energy_kw.toFixed(1)} кВт</span>
        </div>
        <div class="resource-row">
            <span class="resource-label">Производство</span>
            <span class="resource-value">${objectResources.produced_energy_kw.toFixed(1)} кВт</span>
        </div>
        <div class="resource-row">
            <span class="resource-label">Потребление</span>
            <span class="resource-value">${objectResources.consumed_energy_kw.toFixed(1)} кВт</span>
        </div>
        <div class="resource-status ${objectResources.net_energy_kw >= 0 ? 'status-ok' : 'status-critical'}">
            ${objectResources.net_energy_kw >= 0 ? 'Энергии объекту достаточно' : 'Объект потребляет больше, чем производит (или только потребляет)'}
        </div>
    `;
    resourceContainer.appendChild(energySection);

    // Вода
    const waterSection = document.createElement('div');
    waterSection.className = 'resource-section';
    waterSection.innerHTML = `
        <h4>Вода</h4>
        <div class="resource-row">
            <span class="resource-label">Баланс (объекта)</span>
            <span class="resource-value">${objectResources.net_water_l_day.toFixed(0)} л/сутки</span>
        </div>
         <div class="resource-row">
            <span class="resource-label">Производство</span>
            <span class="resource-value">${objectResources.produced_water_l_day.toFixed(0)} л/сутки</span>
        </div>
        <div class="resource-row">
            <span class="resource-label">Потребление</span>
            <span class="resource-value">${objectResources.consumed_water_l_day.toFixed(0)} л/сутки</span>
        </div>
        <div class="resource-status ${objectResources.net_water_l_day >= 0 ? 'status-ok' : 'status-critical'}">
            ${objectResources.net_water_l_day >= 0 ? 'Воды объекту достаточно' : 'Объект потребляет больше воды, чем производит'}
        </div>
    `;
    resourceContainer.appendChild(waterSection);

    // Кислород
    const oxygenSection = document.createElement('div');
    oxygenSection.className = 'resource-section';
    oxygenSection.innerHTML = `
        <h4>Кислород</h4>
        <div class="resource-row">
            <span class="resource-label">Баланс (объекта)</span>
            <span class="resource-value">${objectResources.net_oxygen_kg_day.toFixed(2)} кг/сутки</span>
        </div>
        <div class="resource-row">
            <span class="resource-label">Производство</span>
            <span class="resource-value">${objectResources.produced_oxygen_kg_day.toFixed(2)} кг/сутки</span>
        </div>
        <div class="resource-row">
            <span class="resource-label">Потребление</span>
            <span class="resource-value">${objectResources.consumed_oxygen_kg_day.toFixed(2)} кг/сутки</span>
        </div>
         <div class="resource-status ${objectResources.net_oxygen_kg_day >= 0 ? 'status-ok' : 'status-critical'}">
            ${objectResources.net_oxygen_kg_day >= 0 ? 'Кислорода объекту достаточно' : 'Объект потребляет больше кислорода, чем производит'}
        </div>
    `;
    resourceContainer.appendChild(oxygenSection);


    // Показываем панель с деталями и скрываем сообщение "Выберите модуль"
    detailsContentPanel.style.display = 'block'; 
    selectPromptMessage.style.display = 'none'; 

    // Подсветка выбранной карточки в списке
    const allModuleCards = document.querySelectorAll('#placed-modules-container .module-card');
    allModuleCards.forEach(card => {
        card.classList.toggle('selected', card.dataset.id === objectId);
    });
}


/**
 * Заполняет список размещенных модулей (карточек) в менеджере модулей.
 */
function populateModuleList() {
    const container = document.getElementById('placed-modules-container');
    const noModulesMessage = document.getElementById('no-modules-message');
    // Элементы для правой панели (информация о модуле)
    const detailsContentPanel = document.getElementById('module-details-content');
    const selectPromptMessage = document.getElementById('select-module-prompt');

    console.log("Проверка элементов для populateModuleList:");
    console.log("container:", container);
    console.log("noModulesMessage:", noModulesMessage);
    console.log("detailsContentPanel:", detailsContentPanel);
    console.log("selectPromptMessage:", selectPromptMessage);

    if (!container || !noModulesMessage || !detailsContentPanel || !selectPromptMessage) {
        console.error("Не найдены все необходимые элементы для менеджера модулей!");
        return;
    }

    container.innerHTML = ''; // Очищаем контейнер перед заполнением

    if (placedObjects.length === 0) {
        noModulesMessage.style.display = 'block'; // Показываем "Пока нет размещенных модулей."
        // Скрываем детали и показываем общее приглашение на правой панели
        detailsContentPanel.style.display = 'none';
        selectPromptMessage.style.display = 'block';
        selectPromptMessage.textContent = "Разместите свой первый модуль на карте!";
    } else {
        noModulesMessage.style.display = 'none'; // Скрываем сообщение "нет модулей"
        // По умолчанию, если модули есть, но ни один не выбран, показываем приглашение
        // (displayModuleInfo скроет это приглашение, если модуль будет выбран)
        // detailsContentPanel.style.display = 'none'; // Это будет управляться displayModuleInfo
        // selectPromptMessage.style.display = 'block';
        // selectPromptMessage.textContent = "Выберите модуль слева для просмотра информации.";


        placedObjects.forEach(obj => {
            const card = document.createElement('div');
            card.className = 'module-card';
            card.dataset.id = obj.id; // Сохраняем ID объекта для обработчика клика

            const img = document.createElement('img');
            img.alt = obj.displayName || 'Иконка модуля';
            
            // Логика выбора иконки для карточки (аналогично как для маркера на карте)
            let cardIconFilename = 'default_icon.png';
             if (obj.type.includes('residential') || obj.type.includes('sports') || 
                obj.type.includes('administrative') || obj.type.includes('medical_module')) {
                cardIconFilename = 'res_icon.png';
            } else if (obj.type.includes('repair') || obj.type.includes('spaceport') || 
                       obj.type.includes('communication') || obj.type.includes('plantation') || 
                       obj.type.includes('waste') || obj.type.includes('production') || 
                       obj.type.includes('solar_power_plant') || obj.type.includes('nuclear_power_plant') || 
                       obj.type.includes('mining_shaft')) {
                cardIconFilename = 'tech_icon.png';
            } else if (obj.type.includes('science_lab') || obj.type.includes('observatory')) {
                cardIconFilename = 'science_icon.png';
            }
            // ПУТЬ К ИКОНКАМ! Убедись, что он правильный относительно HTML
            // Если main.js в js/, а images/ в корне:
            img.src = `../images/icons-map/${cardIconFilename}`; 
            // Если main.js и images/ в корне:
            // img.src = `images/icons-map/${cardIconFilename}`;

            const p = document.createElement('p');
            p.textContent = obj.displayName || obj.type; // Используем сохраненное displayName

            card.appendChild(img);
            card.appendChild(p);

            card.addEventListener('click', (event) => {
                const clickedId = event.currentTarget.dataset.id;
                displayModuleInfo(clickedId); // Вызываем нашу глобальную функцию
            });

            container.appendChild(card);
        });

        // После перерисовки списка, если ранее был выбран модуль, его информация скроется.
        // Можно либо сбросить правую панель, либо попытаться заново отобразить инфо для последнего выбранного.
        // Пока просто сбрасываем:
        const anyCardSelected = container.querySelector('.module-card.selected');
        if (!anyCardSelected) { // Если после перерисовки ни одна карточка не выбрана
            detailsContentPanel.style.display = 'none';
            selectPromptMessage.style.display = 'block';
            selectPromptMessage.textContent = "Выберите модуль слева для просмотра информации.";
        }
    }
}

// Вызов инициализации обработчиков для размещения и менеджера модулей
document.addEventListener('DOMContentLoaded', () => {
    setupObjectPlacement(); 
    // populateModuleList(); // Начальное заполнение, если нужно
    // displayModuleInfo(); // Если нужно показать инфо о первом/выбранном модуле
});



// Тур по лунной базе

// const showTourBtn = document.getElementById('show-unity-tour-btn');
// const unityTourWrapper = document.getElementById('unity-tour-wrapper');
// const unityIframe = document.getElementById('unity-iframe');
// const closeTourBtn = document.getElementById('close-unity-tour-btn');
// if (showTourBtn && unityTourWrapper && unityIframe && closeTourBtn) {
//     showTourBtn.addEventListener('click', () => {
//         unityIframe.src = 'tour/index.html'; 
//         // unityTourWrapper.style.display = 'flex'; 
//         unityTourWrapper.classList.add('visible');
//     });

//     const closeTour = () => {
//         unityTourWrapper.classList.remove('visible');
//         unityIframe.src = ''; 
//         setTimeout(() => { unityIframe.src = ''; }, 300); 
//     };

//     closeTourBtn.addEventListener('click', closeTour);
//     unityTourWrapper.addEventListener('click', (event) => {
//         if (event.target === unityTourWrapper) {
//             closeTour();
//         }
//     });
// }




// В main.js

function initializeHelpModal() {
    const helpButton = document.getElementById('help-nav-btn');  // Предполагаем, что кнопка "Справка" это первая .nav__btn
                                                          // Лучше дать ей уникальный ID, например, id="help-nav-btn"
    // Если у кнопки "Справка" есть ID, например, id="help-menu-button":
    // const helpButton = document.getElementById('help-menu-button'); 
    
    const helpModalOverlay = document.getElementById('help-modal-overlay');
    const closeHelpModalBtn = document.getElementById('close-help-modal-btn');

    if (!helpButton) {
        console.warn("Кнопка для открытия справки не найдена.");
        return;
    }
    if (!helpModalOverlay || !closeHelpModalBtn) {
        console.warn("Элементы модального окна справки не найдены.");
        return;
    }

    const openHelpModal = () => {
        helpModalOverlay.classList.add('visible');
    };

    const closeHelpModal = () => {
        helpModalOverlay.classList.remove('visible');
    };

    helpButton.addEventListener('click', openHelpModal);
    closeHelpModalBtn.addEventListener('click', closeHelpModal);

    // Закрытие по клику на оверлей
    helpModalOverlay.addEventListener('click', (event) => {
        if (event.target === helpModalOverlay) {
            closeHelpModal();
        }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && helpModalOverlay.classList.contains('visible')) {
            closeHelpModal();
        }
    });
    console.log("Модальное окно справки инициализировано.");
}


const myVideo = document.querySelector('.help-video'); 
if (myVideo) {
    myVideo.playbackRate = 2;
}
