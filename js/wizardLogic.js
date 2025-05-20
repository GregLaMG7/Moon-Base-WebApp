// js/wizardLogic.js

// Переменная для хранения выбора объекта (сделаем ее доступной через объект)
const wizardState = {
    selectedObjectType: null
};

// Функция для инициализации выбора объекта
function initializeObjectSelection() {
    const objectItems = document.querySelectorAll('.tabs-content__object-item');
    const gotoStep2Button = document.getElementById('goto-step2-btn');

    if (gotoStep2Button) {
        gotoStep2Button.disabled = true;
    } else {
        console.error("#goto-step2-btn не найден!"); // Добавим проверку
        // return; // Если кнопка критична, можно выйти
    }
     if (!objectItems || objectItems.length === 0) {
         console.error(".tabs-content__object-item не найдены!");
         return;
     }

    objectItems.forEach(item => {
        item.addEventListener('click', () => {
            objectItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            wizardState.selectedObjectType = item.dataset.objectType; // Сохраняем в объект
            console.log("Выбран объект:", wizardState.selectedObjectType);
            if (gotoStep2Button) {
                gotoStep2Button.disabled = false;
            }
            updateWizardStep2(wizardState.selectedObjectType);
        });
    });
     console.log("Обработчики выбора объектов установлены.");
}

// Функция для обновления Шага 2 (может остаться здесь или быть вынесена)
function updateWizardStep2(objectType) {
    const step2TitleSpan = document.querySelector('#step-2-content .tabs-content__tab-title span');
    const step2Image = document.querySelector('#step-2-content .tabs-content__modul-img img');

    if (!step2TitleSpan || !step2Image) {
        console.error("Не найдены элементы заголовка или картинки на Шаге 2!");
        return;
    }

    let objectName = "Неизвестный объект";
    let objectImage = "images/module_placeholder.png";

    switch (objectType) {
        case 'residential_module_type1':
            objectName = "Жилой модуль тип 1";
            objectImage = "images/module1.png";
            break;
        case 'residential_module_type2':
            objectName = "Жилой модуль тип 2";
            objectImage = "images/module2.png";
            break;
        case 'tech_object_variant1':
            objectName = "Тех. объект вариант 1";
            objectImage = "images/tech1.png";
            break;
        // Добавить case для остальных типов...
        default:
            console.warn("Неизвестный тип объекта для Шага 2:", objectType);
    }

    step2TitleSpan.textContent = objectName;
    step2Image.src = objectImage;
    step2Image.alt = objectName;
}

// Функция для инициализации логики табов визарда (если нужно вынести)
function initializeWizardTabs() {
    const tabs = document.querySelectorAll('.wizard-tabs__tab');
    const contentPanels = document.querySelectorAll('.tabs-content__tab');
    const nextWizardStepButtons = document.querySelectorAll('.tabs-content__next-btn:not(#goto-step2-btn)'); // Исключаем кнопку Шага 1

    // Функция активации таба (может быть локальной или глобальной, если нужна в main.js)
    const activateTab = (tabToActivate) => { /* ... код activateTab ... */ };

    // ... остальной код для табов и кнопок "Далее" (Шаг 2 -> Шаг 3) ...
    // Убедитесь, что activateTab здесь доступна
}

