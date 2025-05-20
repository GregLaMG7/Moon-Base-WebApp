let objectParametersConfig = {};

document.addEventListener('DOMContentLoaded', async () => { // Не забудьте async

    // --- ЗАГРУЗКА КОНФИГУРАЦИИ ПАРАМЕТРОВ ОБЪЕКТОВ ---
    try {
        const response = await fetch('../data/object_parameters.json'); // Путь к вашему файлу
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        objectParametersConfig = await response.json();
        console.log("Конфигурация параметров объектов загружена:", objectParametersConfig);
    } catch (error) {
        console.error("Не удалось загрузить конфигурацию параметров объектов:", error);
        // Можно отобразить ошибку пользователю или использовать дефолтные параметры
    }
    // --- КОНЕЦ ЗАГРУЗКИ КОНФИГУРАЦИИ ---


    // ... (весь ваш остальной код внутри DOMContentLoaded) ...
});




function validateStep2Form() {
    const parametersContainer = document.querySelector('#step-2-content .tabs-setting__set-list');
    const gotoStep3Button = document.querySelector('#step-2-content .tabs-content__next-btn');
    if (!parametersContainer || !gotoStep3Button) return;
    let isFormValid = true;
    const currentConfig = objectParametersConfig[selectedObjectType] || objectParametersConfig['default_object_config'];
    if (currentConfig && currentConfig.parameters) {
        currentConfig.parameters.forEach(paramConfig => {
            const inputElement = document.getElementById(`param-${paramConfig.id}`);
            const errorElement = document.getElementById(`error-param-${paramConfig.id}`); // Исправлено: ID ошибки
            if (!inputElement) return; // Пропускаем, если поле не найдено
            let errorMessage = '';
            const value = inputElement.value.trim();
            const validationRules = paramConfig.validation;
            if (validationRules) {
                // 1. Проверка на required
                if (validationRules.required && value === '') {
                    errorMessage = 'Это поле обязательно для заполнения.';
                    isFormValid = false;
                }
                // 2. Проверка числовых значений (если поле не пустое или required)
                if (errorMessage === '' && (value !== '' || validationRules.required)) {
                    if (paramConfig.inputType === 'number') {
                        const numValue = parseFloat(value);
                        if (isNaN(numValue)) {
                            errorMessage = 'Введите корректное число.';
                            isFormValid = false;
                        } else {
                            if (validationRules.minValue !== undefined && numValue < validationRules.minValue) {
                                errorMessage = `Минимальное значение: ${validationRules.minValue}.`;
                                isFormValid = false;
                            }
                            if (validationRules.maxValue !== undefined && numValue > validationRules.maxValue) {
                                errorMessage = `Максимальное значение: ${validationRules.maxValue}.`;
                                isFormValid = false;
                            }
                            if (validationRules.isInteger && !Number.isInteger(numValue)) {
                                errorMessage = 'Значение должно быть целым числом.';
                                isFormValid = false;
                            }
                        }
                    }
                    // 3. Проверка по списку допустимых значений
                    if (validationRules.allowedValues && !validationRules.allowedValues.includes(value) && value !== '') {
                         // Сравниваем с учетом регистра или без? Пока с учетом.
                         // Для сравнения без учета регистра:
                         // const lowerAllowedValues = validationRules.allowedValues.map(v => v.toLowerCase());
                         // if (!lowerAllowedValues.includes(value.toLowerCase())) { ... }
                        errorMessage = `Допустимые значения: ${validationRules.allowedValues.join(', ')}.`;
                        isFormValid = false;
                    }
                }
            }
            // Отображение/скрытие сообщения об ошибке
            if (errorElement) {
                errorElement.textContent = errorMessage;
                errorElement.style.display = errorMessage ? 'block' : 'none';
            }
        });
    } else {
        // Если для объекта нет настраиваемых параметров, форма считается валидной
        isFormValid = true;
    }
    gotoStep3Button.disabled = !isFormValid;
    console.log("Форма Шага 2 валидна:", isFormValid);
}




// FOR LISTS
document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.querySelector('.window-global__js-toggle');
    // Находим блок контента, который будем скрывать/показывать
    // Он должен быть ПРЯМО ПОСЛЕ кнопки или нужно использовать более точный селектор
    const contentToToggle = document.querySelector('.window-global__all-spec');
    // Находим иконку внутри кнопки для вращения (если нужно вращать именно ее)
    // const iconToRotate = toggleButton ? toggleButton.querySelector('img') : null; // Уже не нужно, управляем через класс на кнопке

    // Проверяем, найдены ли оба элемента
    if (toggleButton && contentToToggle) {

        // Устанавливаем начальное состояние доступности (если скрыто по умолчанию)
        toggleButton.setAttribute('aria-expanded', 'false');

        // Добавляем обработчик клика на кнопку
        toggleButton.addEventListener('click', () => {
            // Переключаем класс 'is-expanded' у блока контента
            const isCurrentlyExpanded = contentToToggle.classList.toggle('is-expanded');

            // Переключаем класс 'is-expanded' у самой кнопки (для стилизации стрелки)
            toggleButton.classList.toggle('is-expanded', isCurrentlyExpanded);

            // Обновляем атрибут aria-expanded для доступности
            toggleButton.setAttribute('aria-expanded', isCurrentlyExpanded);

        });
    } else {
        // Выводим предупреждение, если элементы не найдены
        console.warn('Accordion toggle button or content not found. Check selectors.');
    }

    // --- Здесь может быть остальной ваш JS-код ---

    const objectCategoryTitles = document.querySelectorAll('.tabs-content__object-title');

    // Проходим по каждому найденному заголовку
    objectCategoryTitles.forEach(titleElement => {

        // Находим СОСЕДНИЙ элемент списка для этого заголовка
        const listToToggle = titleElement.nextElementSibling;

        // Проверяем, что соседний элемент - это действительно список объектов
        if (listToToggle && listToToggle.classList.contains('tabs-content__object-list')) {



            // Добавляем обработчик клика на заголовок
            titleElement.addEventListener('click', () => {

                // Переключаем класс 'is-expanded' у самого заголовка (для поворота стрелки)
                titleElement.classList.toggle('is-expanded');

                // Переключаем класс 'is-expanded' у списка объектов (для анимации max-height/opacity)
                listToToggle.classList.toggle('is-expanded');

            });
        } else {
            console.warn('Не найден список объектов (.tabs-content__object-list) после заголовка:', titleElement);
        }
    });



    // Находим заголовок, по которому будем кликать
    const settingsTitle = document.querySelector('.tabs-content__settings-title');

    // Проверяем, найден ли заголовок
    if (settingsTitle) {
        // Находим СОСЕДНИЙ элемент списка для этого заголовка
        // В твоей структуре HTML он идет сразу после заголовка
        const listToToggle = settingsTitle.nextElementSibling;

        // Проверяем, что соседний элемент - это действительно наш список
        if (listToToggle && listToToggle.classList.contains('tabs-setting__set-list')) {


            // Добавляем обработчик клика на заголовок
            settingsTitle.addEventListener('click', () => {

                // Переключаем класс 'is-expanded' у самого заголовка (для поворота стрелки)
                settingsTitle.classList.toggle('is-expanded');

                // Переключаем класс 'is-expanded' у списка (для анимации max-height/opacity)
                listToToggle.classList.toggle('is-expanded');
            });

        } else {
            console.warn('Не найден список настроек (.tabs-setting__set-list) сразу после заголовка:', settingsTitle);
        }
    } else {
        console.warn('Не найден заголовок настроек (.tabs-content__settings-title)');
    }




    // 1. Находим кнопку "Перейти к размещению объектов"
    const nextStepButton = document.getElementById('btn-next-stepone');
    // или document.querySelector('#btn-next-stepone');

    // 2. Находим ОБА блока с контентом шагов
    // querySelectorAll вернет NodeList (похожий на массив)
    const contentSteps = document.querySelectorAll('.window-global__scroll-content');

    // 3. Проверяем, что нашли и кнопку, и хотя бы два шага
    if (nextStepButton && contentSteps.length >= 2) {

        // Получаем первый и второй шаг для удобства
        const stepOneContent = contentSteps[0];
        const stepTwoContent = contentSteps[1];


        // 4. Добавляем обработчик клика на кнопку
        nextStepButton.addEventListener('click', (event) => {
            // event.preventDefault(); // Раскомментируй, если кнопка внутри <form> и ты не хочешь отправки формы

            console.log('Переход к следующему шагу...'); // Для отладки

            // Скрываем первый шаг (добавляем класс 'hidden')
            stepOneContent.classList.add('hidden');

            // Показываем второй шаг (удаляем класс 'hidden')
            stepTwoContent.classList.remove('hidden');
        });

    } else {
        // Сообщения об ошибках, если что-то не найдено
        if (!nextStepButton) {
            console.error('Ошибка: Кнопка с ID "btn-next-stepone" не найдена!');
        }
        if (contentSteps.length < 2) {
            console.error('Ошибка: Найдено менее двух элементов с классом "window-global__scroll-content"!');
        }
    }
});









// FOR TABS
document.addEventListener('DOMContentLoaded', () => {

    // Находим все кнопки табов
    const tabs = document.querySelectorAll('.wizard-tabs__tab');
    // Находим все панели контента
    const contentPanels = document.querySelectorAll('.tabs-content__tab');
    // Находим все кнопки "Далее" внутри панелей
    const nextStepButtons = document.querySelectorAll('.tabs-content__next-btn'); // *** НОВОЕ ***

    // --- Функция для активации таба и его панели ---
    // (Важно, чтобы она была доступна для кода ниже, поэтому она вне блока if)
    const activateTab = (tabToActivate) => {
        if (!tabToActivate) return; // Защита, если таб не найден

        // Получаем ID целевой панели из атрибута aria-controls или data-target-panel
        const targetPanelId = tabToActivate.getAttribute('aria-controls') || tabToActivate.dataset.targetPanel;
        if (!targetPanelId) {
             console.warn("Таб не имеет атрибута aria-controls или data-target-panel:", tabToActivate);
             return;
        }

        // 1. Деактивируем ВСЕ табы и панели
        tabs.forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
            tab.setAttribute('tabindex', '-1'); // Убираем из навигации Tab
        });
        contentPanels.forEach(panel => {
            panel.classList.remove('active');
        });

        // 2. Активируем нужный таб
        tabToActivate.classList.add('active');
        tabToActivate.setAttribute('aria-selected', 'true');
        tabToActivate.removeAttribute('tabindex'); // Делаем активный таб доступным через Tab

        // 3. Активируем соответствующую панель контента
        const targetPanel = document.getElementById(targetPanelId);
        if (targetPanel) {
            targetPanel.classList.add('active');
             // Опционально: Прокрутка к началу табов или панели
             // targetPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
             // tabToActivate.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            console.warn(`Панель контента с ID "${targetPanelId}" не найдена!`);
        }


        if (tabToActivate && tabToActivate.id === 'tab-2') {
            validateStep2Form();
        }
    };
    // --- Конец функции activateTab ---


    // Проверяем, что ОСНОВНЫЕ элементы табов найдены
    if (tabs.length > 0 && contentPanels.length > 0) {

        // Добавляем слушатель клика на КАЖДЫЙ таб
        tabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                activateTab(event.currentTarget);
            });

            // Обработка Enter/Space для доступности
            tab.addEventListener('keydown', (event) => {
                 if (event.key === 'Enter' || event.key === ' ') {
                     event.preventDefault();
                     activateTab(event.currentTarget);
                 }
                 // TODO: Можно добавить навигацию стрелками влево/вправо
            });
        });

        // Инициализация: Убедимся, что активный таб из HTML соответствует активной панели
        const initialActiveTab = document.querySelector('.wizard-tabs__tab.active');
        if (initialActiveTab) {
             activateTab(initialActiveTab); // Просто вызовем activateTab для синхронизации
        } else if (tabs.length > 0) {
             // Если активный таб не задан в HTML, активируем первый
             activateTab(tabs[0]);
        }

    } // Конец if (tabs.length > 0 && contentPanels.length > 0)


    // *** НАЧАЛО НОВОГО КОДА ДЛЯ КНОПОК "ДАЛЕЕ" ***
    if (nextStepButtons.length > 0 && tabs.length > 0) { // Убедимся, что кнопки и табы есть
        nextStepButtons.forEach(button => {
            button.addEventListener('click', () => {
                // 1. Найти текущий активный таб
                const currentActiveTab = document.querySelector('.wizard-tabs__tab.active');
                if (!currentActiveTab) return; // Если активный таб не найден, ничего не делаем

                // 2. Найти СЛЕДУЮЩИЙ таб в разметке
                const nextTab = currentActiveTab.nextElementSibling;

                // 3. Проверить, что следующий элемент существует и это действительно таб
                if (nextTab && nextTab.classList.contains('wizard-tabs__tab')) {
                    // 4. Активировать следующий таб с помощью нашей функции
                    activateTab(nextTab);
                } else {
                    // Мы на последнем шаге, или структура HTML нарушена
                    console.log("Достигнут последний шаг или следующий элемент не таб.");
                    // Здесь можно, например, разблокировать/показать финальную кнопку "Разместить объект"
                    // или выполнить другое действие для последнего шага.
                    // Если кнопка "Перейти к настройкам расположения" должна вести на таб 3,
                    // а после него больше нет табов, то этот else сработает.
                }
            });
        });
    }

}); // Конец DOMContentLoaded










// ================================================
// Словарики
// ================================================
const objectDisplayNames = {
  'residential_module_type1': 'Жилой модуль Альфа', 
  'residential_module_type2': 'Жилой модуль Бета',
  'tech_object_variant1': 'Техноблок Ресурс-1',
  'tech_object_variant2': 'Техноблок Энергия-1',
  'science_object_1': 'Лаборатория Гео',
  'science_object_2': 'Обсерватория Астро',
  'default': 'Неизвестный объект'
};

const objectDisplayTypes = {
  'residential_module_type1': 'Жилой (стандартный)',
  'residential_module_type2': 'Жилой (расширенный)',
  'tech_object_variant1': 'Технологический (ресурсы)',
  'tech_object_variant2': 'Технологический (энергетика)',
  'science_object_1': 'Научный (геология)',
  'science_object_2': 'Научный (астрономия)',
  'default': 'Неизвестный тип'
};












// ================================================
// Глобальные функции (вне DOMContentLoaded)
// ================================================

/**
 * Симулирует получение свойств участка на основе координат.
 * @param {object} lngLat Объект с координатами { lng: number, lat: number }.
 * @returns {object} Объект со свойствами участка.
 */
// function getSimulatedSiteProperties(lngLat) {
//     console.log("Симуляция свойств для:", lngLat);

//     // --- Симуляция Уклона ---
//     let simulatedSlope;
//     if (Math.abs(lngLat.lat) > 70 && Math.random() > 0.5) {
//         simulatedSlope = (Math.random() * 10 + 10).toFixed(1); // 10-20 градусов
//     } else if (Math.abs(lngLat.lat) > 50 && Math.random() > 0.6) {
//         simulatedSlope = (Math.random() * 5 + 5).toFixed(1);   // 5-10 градусов
//     } else {
//         simulatedSlope = (Math.random() * 5 + 0.5).toFixed(1); // 0.5-5.5 градусов
//     }
//     simulatedSlope = parseFloat(simulatedSlope);

//     // --- Оценка Уклона ---
//     let slopeRating = "Хорошо";
//     let slopeIndicator = "green-color";
//     let flatnessText = "Ровная площадка";
//     if (simulatedSlope > 10) {
//         slopeRating = "Плохо (>10°)";
//         slopeIndicator = "green-red";
//         flatnessText = "Значительный уклон";
//     } else if (simulatedSlope > 5) {
//         slopeRating = "Средне (5-10°)";
//         slopeIndicator = "green-yellow";
//         flatnessText = "Умеренный уклон";
//     }

//     // --- Симуляция Радиации ---
//     let radiationLevel = "Низкая";
//     let radiationIndicator = "green-color"; // Низкая - это хорошо для размещения
//     let radiationWarning = "";
//     if (Math.abs(lngLat.lat) > 75 && Math.random() > 0.4) {
//         radiationLevel = "Высокая";
//         radiationIndicator = "green-red";
//         radiationWarning = "(Требуется серьезная защита!)";
//     } else if (Math.abs(lngLat.lat) > 60 && Math.random() > 0.5) {
//         radiationLevel = "Средняя";
//         radiationIndicator = "green-yellow";
//         radiationWarning = "(Требуется усиление)";
//     }

//     // --- Симуляция Безопасности ---
//     let seismicRisk = Math.random() > 0.8 ? 'Высокая' : (Math.random() > 0.4 ? 'Средняя' : 'Низкая');
//     let seismicIndicator = seismicRisk === 'Низкая' ? 'green-color' : (seismicRisk === 'Средняя' ? 'green-yellow' : 'green-red');

//     let meteorRisk = Math.random() > 0.8 ? 'Высокая' : (Math.random() > 0.4 ? 'Средняя' : 'Низкая');
//     let meteorIndicator = meteorRisk === 'Низкая' ? 'green-color' : (meteorRisk === 'Средняя' ? 'green-yellow' : 'green-red');

//     // --- Расчет ОБЩЕЙ ПРИГОДНОСТИ для кнопки ---
//     const hasCriticalIssues =
//         simulatedSlope > 10 ||
//         radiationLevel === 'Высокая' ||
//         seismicRisk === 'Высокая' ||
//         meteorRisk === 'Высокая';

//     const isGenerallySuitable = !hasCriticalIssues;

//     // --- Текст статуса и описание ---
//     let statusText = "Участок требует детального изучения";
//     let description = "Анализ выявил следующие особенности:";
//     let iconSrc = "images/place-bad.svg";
//     if (isGenerallySuitable) {
//         if (slopeRating === 'Хорошо' && radiationLevel === 'Низкая' && seismicRisk === 'Низкая' && meteorRisk === 'Низкая') {
//             statusText = "Участок оптимален";
//             description = "Предварительный анализ показывает отличные условия.";
//             iconSrc = "images/place-ok.svg";
//         } else {
//             statusText = "Участок условно пригоден";
//             description = "Есть факторы (уклон/радиация/безопасность), требующие внимания при проектировании.";
//             iconSrc = "images/place-ok.svg";
//         }
//     } else {
//         statusText = "Участок не рекомендуется";
//         description = "Обнаружены критические факторы (высокий уклон/радиация/опасность). Размещение крайне затруднено или невозможно.";
//         iconSrc = "images/place-bad.svg";
//     }

//     // --- Симуляция Высоты и Угла ---
//     const simulatedElevation = (Math.random() * 1000 - 500).toFixed(0);
//     const simulatedAngle = 0;

//     // --- Формируем результат ---
//     return {
//         clickedLngLat: lngLat,
//         isGenerallySuitable: isGenerallySuitable,
//         statusText: statusText,
//         iconVisible: true,
//         iconSrc: iconSrc,
//         description: description,
//         relief: {
//             slope: simulatedSlope,
//             flatnessText: flatnessText,
//             flatnessIndicator: slopeIndicator
//         },
//         radiation: {
//             protectionText: `Радиационная обстановка: ${radiationLevel} ${radiationWarning}`,
//             indicator: radiationIndicator
//         },
//         safety: {
//             seismicText: `Сейсмическая активность: ${seismicRisk}`,
//             seismicIndicator: seismicIndicator,
//             meteorText: `Метеоритная опасность: ${meteorRisk}`,
//             meteorIndicator: meteorIndicator
//         },
//         simulatedElevation: parseInt(simulatedElevation),
//         simulatedAngle: simulatedAngle
//     };
// }


/**
 * Обновляет информационную панель справа.
 * @param {object} siteData Объект со свойствами участка.
 */
// В main.js, функция updateInfoPanel

function updateInfoPanel(siteData, displayCoords) { // displayCoords - это calculatedLunarCoords из mapMoon.js
    const suitabilityTextElement = document.getElementById('site-suitability-status'); // Элемент для текста у галочки
    const suitabilityIconElement = document.getElementById('site-suitability-icon');   // Сама галочка/крестик
    const shortReviewElement = document.getElementById('site-short-review');        // Короткое описание (бывшее detailedDescription)

    const heightDisplayElement = document.getElementById('site-relief-slope'); // БЫЛО ДЛЯ УКЛОНА, СТАНЕТ ДЛЯ ВЫСОТЫ
    const slopeDisplayTextElement = document.getElementById('site-relief-flatness'); // БЫЛО ДЛЯ "РОВНАЯ ПЛОЩАДКА", СТАНЕТ ДЛЯ ОПИСАНИЯ УКЛОНА
    const slopeIndicatorElement = slopeDisplayTextElement?.previousElementSibling;

    const radiationTextElement = document.getElementById('site-radiation-protection'); // Текст "Радиация: Уровень"
    const radiationIndicatorElement = radiationTextElement?.previousElementSibling;
    // Тебе может понадобиться отдельный элемент для значения радиации, если хочешь показывать и текст и цифру.
    // Пока что `siteData.radiation.protectionText` будет содержать "Радиация: Низкая/Средняя/Высокая"
    // А `siteData.radiation.level_value_text` содержит цифру "400 мкЗв/д"

    const seismicTextElement = document.getElementById('site-safety-seismic');
    const seismicIndicatorElement = seismicTextElement?.previousElementSibling;
    const meteorTextElement = document.getElementById('site-safety-meteor');
    const meteorIndicatorElement = meteorTextElement?.previousElementSibling;
    
    const nextButton = document.getElementById('btn-next-stepone');

    // Обновляем основной статус пригодности
    if (suitabilityTextElement) suitabilityTextElement.textContent = siteData.overallSuitabilityText;
    if (suitabilityIconElement) {
        suitabilityIconElement.src = siteData.statusIcon; // Иконка галочки/крестика
        suitabilityIconElement.style.display = 'inline-block';
    }
    if (shortReviewElement) shortReviewElement.textContent = siteData.detailedDescription; // Общее описание с причинами, если не пригоден

    // Обновляем раздел "Рельеф"
    if (heightDisplayElement) {
        if (siteData.absoluteElevation !== undefined) {
            heightDisplayElement.textContent = `Высота: ${siteData.absoluteElevation} м`;
        } else {
            heightDisplayElement.textContent = "Высота: Н/Д";
        }
    }
    if (slopeDisplayTextElement) slopeDisplayTextElement.textContent = siteData.relief.slope_display_text; // "Незначительный уклон (<5°)"
    if (slopeIndicatorElement) slopeIndicatorElement.setAttribute('data-indicator-color', siteData.relief.flatnessIndicator);


    // Обновляем "Радиационная защита"
    if (radiationTextElement) radiationTextElement.textContent = siteData.radiation.protectionText; // Будет "Радиация: Низкая"
    // Если хочешь добавить значение в мкЗв/д, добавь еще один <p> или измени siteData.radiation.protectionText
    // Например, в mapMoon.js: siteDataForUI.radiation.protectionText = `Радиация: ${siteDataForUI.radiation.level_text} (${siteDataForUI.radiation.level_value_text})`;
    if (radiationIndicatorElement) radiationIndicatorElement.setAttribute('data-indicator-color', siteData.radiation.indicator);

    // Обновляем "Безопасность"
    if (seismicTextElement) seismicTextElement.textContent = siteData.safety.seismicText;
    if (seismicIndicatorElement) seismicIndicatorElement.setAttribute('data-indicator-color', siteData.safety.seismicIndicator);
    if (meteorTextElement) meteorTextElement.textContent = siteData.safety.meteorText;
    if (meteorIndicatorElement) meteorIndicatorElement.setAttribute('data-indicator-color', siteData.safety.meteorIndicator);

    // Блокировка/разблокировка кнопки
    if (nextButton) nextButton.disabled = !siteData.isGenerallySuitable;

    // ... (код для скрытия/показа панелей, если нужно)
}


/**
 * Обновляет поля координат и угла на Шаге 3 визарда.
 * @param {object} siteData Объект со свойствами участка.
 */
function updateWizardStep3Coordinates(siteData) {
    const latDisplay = document.getElementById('coord-lat');
    const lngDisplay = document.getElementById('coord-lng');
    const eleDisplay = document.getElementById('coord-ele');
    const angleDisplay = document.getElementById('coord-angle');
    const placementIndicator = document.getElementById('placement-suitability-indicator');
    const placementText = document.getElementById('placement-suitability-text');
    const placeButton = document.getElementById('place-object-button');

    if (!latDisplay || !lngDisplay || !eleDisplay || !angleDisplay || !placementIndicator || !placementText || !placeButton) {
        console.error("Не найдены все элементы на Шаге 3 визарда!");
        return;
    }

    latDisplay.textContent = siteData.clickedLngLat.lat.toFixed(4);
    lngDisplay.textContent = siteData.clickedLngLat.lng.toFixed(4);
    eleDisplay.textContent = siteData.simulatedElevation;
    angleDisplay.textContent = siteData.simulatedAngle;

    lastClickedLngLat = siteData.clickedLngLat;

    const placementSuitability = siteData.isGenerallySuitable;
    placementIndicator.setAttribute('data-indicator-color', placementSuitability ? 'green-color' : 'green-red');
    placementText.textContent = placementSuitability
        ? 'Предварительные критерии для размещения соблюдены.'
        : 'Размещение не рекомендуется из-за критических факторов!';

    placeButton.disabled = !placementSuitability;

    console.log("Координаты и пригодность на Шаге 3 обновлены:", siteData.clickedLngLat, "Пригодно:", placementSuitability);
}

/**
 * Устанавливает начальное состояние информационной панели.
 */
function initializePanelState() {
    const suitabilityStatus = document.getElementById('site-suitability-status');
    const suitabilityIcon = document.getElementById('site-suitability-icon');
    const shortReview = document.getElementById('site-short-review');
    const slope = document.getElementById('site-relief-slope');
    const flatnessText = document.getElementById('site-relief-flatness');
    const radiationText = document.getElementById('site-radiation-protection');
    const seismicText = document.getElementById('site-safety-seismic');
    const meteorText = document.getElementById('site-safety-meteor');
    const nextButton = document.getElementById('btn-next-stepone');
    const infoPanelContent = document.querySelector('.window-global__scroll-content');
    const wizardPanelContent = document.querySelectorAll('.window-global__scroll-content')[1];

    if (suitabilityStatus) suitabilityStatus.textContent = 'Участок не выбран';
    if (suitabilityIcon) suitabilityIcon.style.display = 'none';
    if (shortReview) shortReview.textContent = 'Кликните на карту Луны, чтобы выбрать и проанализировать участок.';
    if (slope) slope.textContent = 'Уклон поверхности: -';
    if (flatnessText) flatnessText.textContent = 'Ровность: -';
    if (radiationText) radiationText.textContent = 'Радиационная обстановка: -';
    if (seismicText) seismicText.textContent = 'Сейсмическая активность: -';
    if (meteorText) meteorText.textContent = 'Метеоритная опасность: -';

    if (nextButton) nextButton.disabled = true;

    const detailsBlock = document.querySelector('.window-global__all-spec');
    const detailsToggle = document.querySelector('.window-global__js-toggle');
    if (detailsBlock && detailsBlock.classList.contains('is-expanded')) {
        detailsToggle?.click();
    }

    if (infoPanelContent && infoPanelContent.classList.contains('hidden')) {
        infoPanelContent.classList.remove('hidden');
    }
    if (wizardPanelContent && !wizardPanelContent.classList.contains('hidden')) {
        wizardPanelContent.classList.add('hidden');
    }
}


// ================================================
// Основной код инициализации (в DOMContentLoaded)
// ================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Инициализация состояния UI ---
    initializePanelState(); // Вызываем нашу функцию установки начального состояния

    // --- Инициализация карты ---
    mapInstance = initializeMapLibreMap(); // Функция из mapMoon.js

    if (mapInstance) {
        console.log("Экземпляр карты доступен в main.js");
        // Можно добавить логику, которая нужна после инициализации карты
    } else {
        console.error("Не удалось инициализировать карту!");
    }

});










document.addEventListener('DOMContentLoaded', () => {
    // ... остальной код инициализации ...
        // --- ЛОГИКА ВЫБОРА ОБЪЕКТА НА ШАГЕ 1 ---
    const objectItems = document.querySelectorAll('.tabs-content__object-item');
    const gotoStep2Button = document.getElementById('goto-step2-btn');

    // Блокируем кнопку перехода на Шаг 2 изначально
    if (gotoStep2Button) {
        gotoStep2Button.disabled = true;
    }

    objectItems.forEach(item => {
        item.addEventListener('click', () => {
            // 1. Снимаем подсветку со всех элементов
            objectItems.forEach(i => i.classList.remove('selected'));

            // 2. Добавляем подсветку к нажатому элементу
            item.classList.add('selected');

            // 3. Запоминаем тип выбранного объекта из data-атрибута
            selectedObjectType = item.dataset.objectType; // Получаем значение data-object-type
            console.log("Выбран объект:", selectedObjectType);

            // 4. Разблокируем кнопку перехода на Шаг 2
            if (gotoStep2Button) {
                gotoStep2Button.disabled = false;
            }

            // 5. Подготавливаем Шаг 2 (пока просто обновим заголовок)
            updateWizardStep2(selectedObjectType); // Вызываем функцию обновления Шага 2
        });
    });

    // --- Функция для обновления Шага 2 ---
    
        // --- Функция для обновления Шага 2 (ВНУТРИ DOMContentLoaded) ---
        // --- Функция для обновления Шага 2 (ВНУТРИ DOMContentLoaded) ---
        // --- Функция для обновления Шага 2 (ВНУТРИ DOMContentLoaded) ---
    // ВАРИАНТ: ВСЕ ПАРАМЕТРЫ КАК ТЕКСТОВЫЕ ПОЛЯ
        // --- Функция для обновления Шага 2 (ВНУТРИ DOMContentLoaded) ---
    function updateWizardStep2(objectType) {
        const step2TitleSpan = document.querySelector('#step-2-content .tabs-content__tab-title span');
        const step2Image = document.querySelector('#step-2-content .tabs-content__modul-img img');
        const parametersContainer = document.querySelector('#step-2-content .tabs-setting__set-list');
        // Находим кнопку перехода на Шаг 3 (раньше она могла быть в другой части кода)
        const gotoStep3Button = document.querySelector('#step-2-content .tabs-content__next-btn');


        if (!step2TitleSpan || !step2Image || !parametersContainer || !gotoStep3Button) {
            console.error("Не найдены все необходимые элементы на Шаге 2 (включая кнопку 'Далее')!");
            return;
        }

        const config = objectParametersConfig[objectType] || objectParametersConfig['default_object_config'];

        if (!config) { /* ... обработка ошибки ... */ return; }

        step2TitleSpan.textContent = config.displayName;
        step2Image.src = config.image;
        step2Image.alt = config.displayName;
        parametersContainer.innerHTML = ''; // Очищаем

        let allInputsValid = true; // Флаг для начальной проверки

        if (config.parameters && config.parameters.length > 0) {
            config.parameters.forEach(param => {
                const paramItemDiv = document.createElement('div');
                paramItemDiv.className = 'tabs-settings__set-item';
                const fieldId = `param-${param.id}`;

                // Определяем тип инпута для HTML
                const htmlInputType = param.inputType || 'text';

                // Атрибуты валидации
                let validationAttrs = '';
                if (param.validation) {
                    if (param.validation.required) validationAttrs += ' required';
                    if (param.validation.minValue !== undefined) validationAttrs += ` min="${param.validation.minValue}"`;
                    if (param.validation.maxValue !== undefined) validationAttrs += ` max="${param.validation.maxValue}"`;
                    // Для isInteger и allowedValues валидацию будем делать в JS
                }

                const inputHtml = `<input type="${htmlInputType}"
                                          class="tabs-settings__input-area"
                                          id="${fieldId}"
                                          name="${fieldId}"
                                          placeholder="${param.placeholder || ''}"
                                          ${validationAttrs}>`; // Добавляем атрибуты валидации

                const labelHtml = `<label for="${fieldId}" style="display:block; margin-bottom: 5px; font-weight: 500;">${param.label || param.id}</label>`;
                const descriptionHtml = `<p class="tabs-settings__set-des">${param.description || ''}</p>`;
                // Элемент для сообщений об ошибках валидации
                const errorHtml = `<p class="validation-error-message" id="error-${fieldId}" style="color: red; font-size: 0.9em; margin-top: 5px; display: none;"></p>`;


                paramItemDiv.innerHTML = `
                    ${labelHtml}
                    <div class="tabs-settings__input-wrapper">
                        ${inputHtml}
                    </div>
                    ${errorHtml}
                    ${descriptionHtml}
                `;
                parametersContainer.appendChild(paramItemDiv);

                // Навешиваем обработчик 'input' для немедленной валидации
                const inputElement = document.getElementById(fieldId);
                if (inputElement) {
                    inputElement.addEventListener('input', () => {
                        validateStep2Form(); // Вызываем общую валидацию формы
                    });
                }
            });
            validateStep2Form(); // Первичная валидация при генерации полей
        } else {
            parametersContainer.innerHTML = '<p>Для данного объекта параметры не настраиваются.</p>';
            gotoStep3Button.disabled = false; // Если параметров нет, кнопка активна
        }
    }
    // --- Конец функции обновления Шага 2 ---

    // --- Конец логики выбора объекта ---


})





let selectedObjectType = null; 
let lastClickedLngLat = null;  // <-- НОВАЯ ПЕРЕМЕННАЯ для координат
let placedObjects = [];
let mapInstance = null;
let objectCounter = 0;




document.addEventListener('DOMContentLoaded', () => {
    // ... (другой код) ...

    // --- ЛОГИКА РАЗМЕЩЕНИЯ ОБЪЕКТА ---
    const placeObjectButton = document.getElementById('place-object-button');
    if (placeObjectButton) {
        placeObjectButton.addEventListener('click', () => {
            // ... (проверки lastClickedLngLat, selectedObjectType, isGenerallySuitable) ...

            // 3. Определяем URL иконки в зависимости от типа объекта
            let currentIconUrl = 'images/icons/default.png'; // Локальная переменная для URL текущей иконки
            let iconSize = 0.5;

            if (selectedObjectType.startsWith('residential_module')) {
                currentIconUrl = '../images/icons-map/module.png'; // Убедитесь, что путь правильный
                iconSize = 0.6;
            } else if (selectedObjectType.startsWith('tech_object')) {
                currentIconUrl = '../images/icons-map/tech.png';   // Убедитесь, что путь правильный
                iconSize = 0.5;
            } else if (selectedObjectType.startsWith('science_object')) {
                currentIconUrl = '../images/icons-map/science.png'; // Убедитесь, что путь правильный
                iconSize = 0.4;
            }
            console.log(`Тип: ${selectedObjectType}, Иконка: ${currentIconUrl}`);

            // 4. Добавляем маркер с кастомной иконкой на карту
            if (typeof mapInstance !== 'undefined' && mapInstance !== null) {
                // --- СОЗДАЕМ КАСТОМНЫЙ HTML-ЭЛЕМЕНТ ДЛЯ МАРКЕРА ---
                const el = document.createElement('div');
                el.className = 'custom-object-marker'; // Новый класс для стилизации, если нужно
                el.style.backgroundImage = `url(${currentIconUrl})`; // Используем определенный URL
                el.style.width = `${64 * iconSize}px`;  // Базовый размер 32px, можно изменить
                el.style.height = `${64 * iconSize}px`;
                el.style.backgroundSize = 'contain';
                el.style.backgroundRepeat = 'no-repeat';
                el.style.cursor = 'pointer'; // Добавим курсор
                // el.style.border = '1px solid red'; // Для отладки, чтобы видеть границы элемента

                // Добавим всплывающую подсказку (опционально)
                const popup = new maplibregl.Popup({ offset: [0, - (16 * iconSize) - 5] }) // Смещаем попап чуть выше центра иконки
                    .setText(`${objectDisplayNames[selectedObjectType] || selectedObjectType}`); // Используем читаемое имя

                // Создаем маркер MapLibre, ПЕРЕДАВАЯ наш кастомный элемент 'el'
                const newObjectMarker = new maplibregl.Marker(el) // <-- ВАЖНО: передаем 'el'
                    .setLngLat(lastClickedLngLat)
                    .setPopup(popup)
                    .addTo(mapInstance);
                // --- КОНЕЦ СОЗДАНИЯ КАСТОМНОГО МАРКЕРА ---

                console.log("Кастомный объект размещен на карте:", newObjectMarker);
                objectCounter++;
                const newObjectId = `${selectedObjectType}_${objectCounter}`;

                // Сохраняем информацию о размещенном объекте
                const siteDataForPlacement = getSimulatedSiteProperties(lastClickedLngLat); // Получаем актуальные симулированные данные
                placedObjects.push({
                    id: newObjectId,
                    type: selectedObjectType,
                    lngLat: lastClickedLngLat,
                    marker: newObjectMarker, // Сохраняем ссылку на сам маркер MapLibre
                    parameters: siteDataForPlacement.parameters // Сохраняем симулированные параметры
                });
                populateModuleList();
                console.log("Размещенные объекты:", placedObjects);

                // Действия после размещения
                selectedObjectType = null;
                const itemsToDeselect = document.querySelectorAll('.tabs-content__object-item');
                itemsToDeselect.forEach(i => i.classList.remove('selected'));
                const step1Tab = document.getElementById('tab-1');
                if (step1Tab && typeof activateTab === 'function') {
                    activateTab(step1Tab);
                }
                alert("Объект успешно размещен!");
                const contentSteps = document.querySelectorAll('.window-global__scroll-content');
                if (contentSteps.length >= 2) {
                    const stepOneContent = contentSteps[0];
                    const stepTwoContent = contentSteps[1];
                    stepTwoContent.classList.add('hidden');
                    stepOneContent.classList.remove('hidden');
                }
            } else {
                console.error("Экземпляр карты 'mapInstance' не доступен для размещения маркера!");
                alert("Ошибка: Не удалось получить доступ к карте для размещения объекта.");
            }
        });
    } else {
        console.error("Кнопка #place-object-button не найдена!");
    }
    // --- КОНЕЦ ЛОГИКИ РАЗМЕЩЕНИЯ ---
});







// ================================================
// Глобальные функции (вне DOMContentLoaded)
// ================================================

// ... (ваши функции getSimulatedSiteProperties, updateInfoPanel и т.д.) ...


/**
 * Отображает информацию о выбранном размещенном объекте.
 * @param {string} objectId ID объекта из массива placedObjects.
 */
function displayModuleInfo(objectId) {
    const infoPanel = document.getElementById('selected-module-info-panel');
    const detailsContent = document.getElementById('module-details-content');
    const selectPrompt = document.getElementById('select-module-prompt');

    const selectedObject = placedObjects.find(obj => obj.id === objectId);

    if (!selectedObject) {
        console.error("Не найден объект с ID:", objectId);
        detailsContent.style.display = 'none';
        selectPrompt.style.display = 'block';
        selectPrompt.textContent = "Ошибка: Не найден выбранный модуль.";
        return;
    }

    console.log("Отображаем информацию для:", selectedObject);

    const nameDisplay = document.getElementById('info-module-name');
    const typeDisplay = document.getElementById('info-module-type');
    const idDisplay = document.getElementById('info-module-id');
    const coordsDisplay = document.getElementById('info-module-coords');
    const statusDisplay = document.getElementById('info-module-status');

    if (!nameDisplay || !typeDisplay || !idDisplay || !coordsDisplay || !statusDisplay) {
         console.error("Не найдены все элементы для вывода информации о модуле!");
         detailsContent.style.display = 'none';
         selectPrompt.style.display = 'block';
         selectPrompt.textContent = "Ошибка: Не удалось отобразить информацию.";
         return;
    }

    // --- ИСПОЛЬЗУЕМ СЛОВАРИ ДЛЯ ОТОБРАЖЕНИЯ ---
    // Получаем читаемое имя из словаря, иначе используем имя по умолчанию
    nameDisplay.textContent = objectDisplayNames[selectedObject.type] || objectDisplayNames['default'];
    // Получаем читаемый тип из словаря, иначе используем тип по умолчанию
    typeDisplay.textContent = objectDisplayTypes[selectedObject.type] || objectDisplayTypes['default'];
    // --- КОНЕЦ ИСПОЛЬЗОВАНИЯ СЛОВАРЕЙ ---

    idDisplay.textContent = selectedObject.id;
    coordsDisplay.textContent = `Ш: ${selectedObject.lngLat.lat.toFixed(4)}, Д: ${selectedObject.lngLat.lng.toFixed(4)}`;

    // --- ИСПРАВЛЕНИЕ ОТОБРАЖЕНИЯ СТАТУСА ---
    // Берем статус и класс из сохраненных параметров объекта
    if (selectedObject.parameters && selectedObject.parameters.status) {
         statusDisplay.textContent = selectedObject.parameters.status;
         // Устанавливаем класс для цвета текста статуса (например, status-ok, status-warning, status-error)
         statusDisplay.className = `info-value status-text ${selectedObject.parameters.statusClass || ''}`;
    } else {
         // Если вдруг параметров нет, ставим заглушку
         statusDisplay.textContent = "Неизвестен";
         statusDisplay.className = 'info-value status-text'; // Сбрасываем классы цвета
    }
    // --- КОНЕЦ ИСПРАВЛЕНИЯ СТАТУСА ---

    detailsContent.style.display = 'block';
    selectPrompt.style.display = 'none';

    // Подсветка выбранной карточки
    const allCards = document.querySelectorAll('#placed-modules-container .module-card');
    allCards.forEach(card => {
        card.classList.toggle('selected', card.dataset.id === objectId);
    });
}


/**
 * Заполняет список размещенных модулей слева.
 */
/**
 * Заполняет список размещенных модулей слева.
 */
function populateModuleList() {
    const container = document.getElementById('placed-modules-container');
    const noModulesMessage = document.getElementById('no-modules-message');
    const selectPrompt = document.getElementById('select-module-prompt');
    const detailsContent = document.getElementById('module-details-content');

    if (!container || !noModulesMessage || !selectPrompt || !detailsContent) {
        console.error("Не найден контейнер или сообщения для списка модулей!");
        return;
    }

    container.innerHTML = ''; // Очищаем

    if (placedObjects.length === 0) {
        noModulesMessage.style.display = 'block';
        detailsContent.style.display = 'none';
        selectPrompt.style.display = 'block';
        selectPrompt.textContent = "Разместите свой первый модуль на карте!";
    } else {
        noModulesMessage.style.display = 'none';
        detailsContent.style.display = 'none';
        selectPrompt.style.display = 'block';
        selectPrompt.textContent = "Выберите модуль слева для просмотра информации.";

        placedObjects.forEach(obj => {
            const card = document.createElement('div');
            card.className = 'module-card';
            card.dataset.id = obj.id;

            const img = document.createElement('img');
            img.alt = objectDisplayNames[obj.type] || objectDisplayNames['default']; // Alt текст из словаря
            // Подбираем иконку по типу (пути к картинкам нужно проверить/настроить)
            if (obj.type.startsWith('residential_module')) {
                img.src = '../images/icons-map/module.png'; // Или icons/module.png
            } else if (obj.type.startsWith('tech_object')) {
                img.src = '../images/icons-map/tech.png'; // Заменить
            } else if (obj.type.startsWith('science_object')) {
                 img.src = '../images/icons-map/science.png'; // Заменить
            } else {
                img.src = 'images/icons/default.png';
            }

            const p = document.createElement('p');
            // !!! ИСПОЛЬЗУЕМ СЛОВАРЬ ДЛЯ НАЗВАНИЯ НА КАРТОЧКЕ !!!
            p.textContent = objectDisplayNames[obj.type] || objectDisplayNames['default'];

            card.appendChild(img);
            card.appendChild(p);

            card.addEventListener('click', (event) => {
                const clickedId = event.currentTarget.dataset.id;
                displayModuleInfo(clickedId);
            });

            container.appendChild(card);
        });
    }
}



document.addEventListener('DOMContentLoaded', () => {
           // --- ПЕРЕКЛЮЧЕНИЕ: Инфо/Визард <-> Менеджер Модулей ---
        const toggleButton = document.getElementById('toggle-module-manager-btn');
        // Панель справа (информация + визард)
        const infoAndWizardPanel = document.getElementById('info-and-wizard-panel');
        // Панель менеджера (на весь экран)
        const moduleManagerView = document.getElementById('module-manager-view');

        if (toggleButton && infoAndWizardPanel && moduleManagerView) {
            toggleButton.addEventListener('click', () => {
                // Проверяем, скрыт ли сейчас менеджер модулей
                const isManagerHidden = moduleManagerView.classList.contains('hidden');

                if (isManagerHidden) {
                    // Показываем менеджер, скрываем инфо/визард панель

                    moduleManagerView.classList.remove('hidden'); // Сделать видимым (opacity сработает)
                    infoAndWizardPanel.classList.add('hidden');    // Сделать прозрачным/невидимым

                    toggleButton.textContent = "Вернуться к карте";
                    populateModuleList(); // Обновить список при показе

                } else {
                    // Скрываем менеджер, показываем инфо/визард панель

                    moduleManagerView.classList.add('hidden');    // Сделать прозрачным/невидимым
                    infoAndWizardPanel.classList.remove('hidden'); // Сделать видимым

                    toggleButton.textContent = "Управление модулями";

                    // Опционально: подгоняем размер карты, если окно менялось
                    if (mapInstance) {
                        // Небольшая задержка, чтобы панель справа успела появиться
                        setTimeout(() => mapInstance.resize(), 50);
                    }
                }
            });

            // Устанавливаем начальное состояние (менеджер скрыт)
            moduleManagerView.classList.add('hidden');
            infoAndWizardPanel.classList.remove('hidden'); // Убедимся, что инфо-панель видима

        } else {
            console.error("Не найдены элементы для переключения видов: кнопка или панели.");
            if (!toggleButton) console.error("Button #toggle-module-manager-btn not found");
            if (!infoAndWizardPanel) console.error("Panel #info-and-wizard-panel not found");
            if (!moduleManagerView) console.error("Panel #module-manager-view not found");
        }
        // --- КОНЕЦ ПЕРЕКЛЮЧЕНИЯ ВИДОВ ---
})















