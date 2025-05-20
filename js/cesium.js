// === Cesium Viewer Module ===

// Используем IIFE (Immediately Invoked Function Expression) для создания модуля
// и инкапсуляции переменных вроде viewer.
const CesiumViewerModule = (function() {

    let viewer = null; // Переменная для хранения экземпляра Viewer
    let cesiumCallbacks = {}; // Объект для хранения колбэков из main.js

    // --- Внутренняя функция: Обработчик клика ---
    // (Перенесли setupMoonClickListener внутрь модуля)
    function setupClickListener() {
        if (!viewer) return; // Проверка, что viewer создан

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        handler.setInputAction(function(movement) {
            const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
            if (cartesian) {
                const cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(cartesian);
                const longitudeDeg = Cesium.Math.toDegrees(cartographic.longitude);
                const latitudeDeg = Cesium.Math.toDegrees(cartographic.latitude);

                console.log(`Клик Cesium: Долгота ${longitudeDeg.toFixed(3)}, Широта ${latitudeDeg.toFixed(3)}`);

                // Вызываем функции, переданные из main.js
                if (cesiumCallbacks.getMockData) {
                    const siteData = cesiumCallbacks.getMockData(cartographic); // Получаем мок-данные

                    if (cesiumCallbacks.updatePanel) {
                        cesiumCallbacks.updatePanel(siteData); // Обновляем панель
                    } else {
                        console.error("CesiumViewerModule: Колбэк 'updatePanel' не предоставлен.");
                    }
                } else {
                    console.error("CesiumViewerModule: Колбэк 'getMockData' не предоставлен.");
                }

            } else {
                 console.log("Клик мимо глобуса.");
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        console.log("Обработчик клика CesiumJS настроен.");
    }


    // --- Основная функция инициализации модуля ---
    // Делаем её async, так как внутри есть await
    async function initialize(cesiumToken, callbacks) {
        console.log("Инициализация модуля Cesium...");

        // Сохраняем колбэки для использования в обработчике клика
        cesiumCallbacks = callbacks || {};

        // Устанавливаем токен
        if (!cesiumToken) {
            console.error("Ошибка: Токен доступа Cesium ION не предоставлен!");
            displayError("Токен доступа Cesium ION не предоставлен.");
            return null;
        }
        Cesium.Ion.defaultAccessToken = cesiumToken;

        try {
            // Асинхронно создаем провайдер рельефа Cesium World Terrain
            console.log("Запрашиваем провайдер рельефа...");
            const worldTerrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
                Cesium.IonResource.fromAssetId(1), { // Asset ID 1 = Cesium World Terrain
                    requestVertexNormals: true
                }
            );
            console.log("Провайдер рельефа получен.");

            // Создаем Viewer
            console.log("Создаем Cesium Viewer...");
            viewer = new Cesium.Viewer('cesiumContainer', { // 'viewer' теперь переменная модуля
                terrainProvider: worldTerrainProvider,
                imageryProvider: new Cesium.TileMapServiceImageryProvider({
                    url: Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
                 }),
                animation: false, timeline: false, fullscreenButton: false, vrButton: false,
                geocoder: false, homeButton: false, infoBox: false, sceneModePicker: false,
                selectionIndicator: false, navigationHelpButton: false, baseLayerPicker: false,
                scene3DOnly: true
            });
            console.log("Cesium Viewer создан.");

            // Заменяем базовый слой на Луну (LRO WAC)
            console.log("Загружаем слой изображений Луны...");
            const moonImageryLayer = await Cesium.ImageryLayer.fromProviderAsync(
                Cesium.IonImageryProvider.fromAssetId(3836) // LRO WAC Global Mosaic
            );
            viewer.imageryLayers.removeAll();
            viewer.imageryLayers.add(moonImageryLayer);
            console.log("Слой изображений Луны добавлен.");

            // Настройки глобуса
            viewer.scene.globe.enableLighting = true;

            // Настройка обработчика клика (вызываем внутреннюю функцию)
            setupClickListener();

            console.log("Модуль CesiumJS успешно инициализирован.");
            return viewer; // Возвращаем созданный viewer

        } catch (error) {
            console.error("Ошибка инициализации Cesium:", error);
            displayError(`Не удалось загрузить 3D вид Луны. Ошибка: ${error.message}. Подробности в консоли.`);
            viewer = null; // Сбрасываем viewer в случае ошибки
            return null;   // Возвращаем null в случае ошибки
        }
    }

    // Вспомогательная функция для отображения ошибки в контейнере
    function displayError(message) {
        const cesiumDiv = document.getElementById('cesiumContainer');
        if (cesiumDiv) {
            cesiumDiv.innerHTML = `<p style="color: red; padding: 20px;">${message}</p>`;
        }
    }

    // --- Публичный интерфейс модуля ---
    // Возвращаем объект с функцией initialize, которую сможет вызвать main.js
    return {
        initialize: initialize
        // Можно добавить другие функции сюда, если нужно будет управлять
        // вьювером извне (например, добавить маркер)
        // getViewerInstance: function() { return viewer; } // Пример
    };

})(); // Немедленно вызываем функцию, чтобы создать модуль