/**
 * Инициализирует карту MapLibre GL JS с WMS слоями.
 * @returns {maplibregl.Map | null} Экземпляр карты или null в случае ошибки.
 */
let currentMapMarker = null;

// Определения проекций для Proj4js
const projWebMercatorDef = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs';
const projLunarTargetDef = '+proj=eqc +R=1737400 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +units=m +no_defs'; // Для IAU2000:30166... (простая цилиндрическая Луны)
const lunarProjNameForProj4 = 'LUNAR_IAU2000_CUSTOM';
const LUNAR_SRS_FOR_WMS_REQUEST = 'IAU2000:30166,9001,0,0';

const WGS84_PROJ_NAME_FOR_PROJ4 = 'EPSG:4326'; // Стандартный WGS84 для lat/lon

if (typeof proj4 !== 'undefined') {
    if (!proj4.defs('EPSG:3857')) {
        proj4.defs('EPSG:3857', projWebMercatorDef);
    }
    // Определение WGS84, если его еще нет (proj4 часто знает 'WGS84' как псевдоним)
    if (!proj4.defs(WGS84_PROJ_NAME_FOR_PROJ4)) {
        proj4.defs(WGS84_PROJ_NAME_FOR_PROJ4, '+proj=longlat +datum=WGS84 +no_defs');
    }
    if (!proj4.defs(lunarProjNameForProj4)) {
        proj4.defs(lunarProjNameForProj4, projLunarTargetDef);
    }
    console.log("Proj4js проекции определены в mapMoon.js:", lunarProjNameForProj4);
} else {
    console.error("Proj4js не определен в mapMoon.js!");
}

function initializeMapLibreMap() {
    try {
        const LUNAR_WMS_BASE_URL = 'http://luna.iaaras.ru/?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&STYLES=&WIDTH=256&HEIGHT=256';
        
        const BASE_MAP_LAYER_NAME = 'luna_wac_global';
        const DEM_MAP_LAYER_NAME = 'luna_wac_dtm';

        const map = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                sources: {
                    'lunar-base-wms-source': {
                        'type': 'raster',
                        'tiles': [
                            `${LUNAR_WMS_BASE_URL}&LAYERS=${BASE_MAP_LAYER_NAME}&SRS=EPSG%3A3857&BBOX={bbox-epsg-3857}`
                        ],
                        'tileSize': 256,
                        'attribution': 'Base: © IAA RAS (luna.iaaras.ru)'
                    },
                    'lunar-dem-wms-source': {
                        'type': 'raster',
                        'tiles': [
                            `${LUNAR_WMS_BASE_URL}&LAYERS=${DEM_MAP_LAYER_NAME}&SRS=EPSG%3A3857&BBOX={bbox-epsg-3857}`
                        ],
                        'tileSize': 256,
                        'attribution': 'DEM: © IAA RAS (luna.iaaras.ru)'
                    }
                },
                layers: [
                    {
                        'id': 'lunar-base-layer',
                        'type': 'raster',
                        'source': 'lunar-base-wms-source',
                        'layout': { 'visibility': 'visible' }
                    },
                    {
                        'id': 'lunar-dem-layer',
                        'type': 'raster',
                        'source': 'lunar-dem-wms-source',
                        'layout': { 'visibility': 'visible' },
                        'paint': { 'raster-opacity': 1 }
                    }
                ]
            },
            center: [0, 0], 
            zoom: 5,      
            minZoom: 3,
            maxZoom: 18,  
            renderWorldCopies: false,
            attributionControl: true
        });

        map.setTransformRequest((url, resourceType) => {
            if (resourceType === 'Tile' && url.includes('luna.iaaras.ru')) {
                // console.log("[TransformRequest] Original URL from MapLibre:", url);
                if (typeof proj4 === 'undefined') {
                    console.error("[TransformRequest] Proj4js не доступен.");
                    return { url }; 
                }
                const bboxMatch = url.match(/BBOX=([^&]+)/);
                const maplibreSrsMatch = url.match(/SRS=([^&]+)/); 
                if (bboxMatch && bboxMatch[1] && maplibreSrsMatch && maplibreSrsMatch[1]) {
                    const maplibreSrsCode = decodeURIComponent(maplibreSrsMatch[1]);
                    const mercatorBboxStr = bboxMatch[1];
                    const mercatorCoords = mercatorBboxStr.split(',').map(Number);
                    try {
                        const p1 = proj4(maplibreSrsCode, lunarProjNameForProj4, [mercatorCoords[0], mercatorCoords[1]]);
                        const p2 = proj4(maplibreSrsCode, lunarProjNameForProj4, [mercatorCoords[2], mercatorCoords[3]]);
                        const lunarBboxValues = [
                            Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1]),
                            Math.max(p1[0], p2[0]), Math.max(p1[1], p2[1])
                        ];
                        const lunarBboxStr = lunarBboxValues.join(',');
                        let newUrl = url.replace(/BBOX=([^&]+)/, `BBOX=${lunarBboxStr}`);
                        newUrl = newUrl.replace(/SRS=([^&]+)/, `SRS=${encodeURIComponent(LUNAR_SRS_FOR_WMS_REQUEST)}`);
                        // console.log("[TransformRequest] Transformed WMS URL:", newUrl);
                        return { url: newUrl };
                    } catch (e) {
                        console.error("[TransformRequest] Proj4js error:", e);
                        return { url }; 
                    }
                } else {
                    console.warn("[TransformRequest] Could not parse BBOX/SRS from URL.");
                }
            }
            return { url }; 
        });

        map.on('click', async (e) => {
            const wgs84LngLat = e.lngLat; // {lng, lat} в WGS84 от MapLibre
            console.log(`Клик MapLibre (WGS84 сырые): Долгота ${wgs84LngLat.lng.toFixed(6)}, Широта ${wgs84LngLat.lat.toFixed(6)}`);

            if (currentMapMarker) currentMapMarker.remove();
            // Ставим маркер по WGS84 координатам, MapLibre его правильно отобразит на своей карте
            currentMapMarker = new maplibregl.Marker({ color: "#FF5733" }).setLngLat(wgs84LngLat).addTo(map);
            
            let lunarLon = null;
            let lunarLat = null;

            if (typeof proj4 !== 'undefined') {
                try {
                    // Шаг 1: Преобразуем экранные координаты MapLibre (которые он отдает как WGS84 lng/lat)
                    // в метрические координаты нашей целевой лунной проекции (lunarProjNameForProj4)
                    // Proj4js ожидает [долгота, широта] для географических систем
                    const projectedLunarXY = proj4(WGS84_PROJ_NAME_FOR_PROJ4, lunarProjNameForProj4, [wgs84LngLat.lng, wgs84LngLat.lat]);
                    // projectedLunarXY теперь содержит [X_лунное_метры, Y_лунное_метры] в проекции lunarProjNameForProj4

                    // Шаг 2: Преобразуем метрические координаты лунной проекции (X, Y)
                    // обратно в лунные географические координаты (долгота, широта в градусах).
                    // Это обратная трансформация для проекции, определенной в lunarProjNameForProj4.
                    // Если lunarProjNameForProj4 это '+proj=eqc +R=...', то это обратная к Plate Carrée.
                    const R_MOON_METERS = 1737400; // Радиус Луны, использованный в projLunarTargetDef
                    
                    // Для проекции Plate Carrée (eqc) с lon_0=0, lat_0=0:
                    // X = R * lambda_rad  => lambda_rad = X / R
                    // Y = R * phi_rad     => phi_rad = Y / R
                    // где lambda_rad - долгота в радианах, phi_rad - широта в радианах
                    lunarLon = (projectedLunarXY[0] / R_MOON_METERS) * (180 / Math.PI);
                    lunarLat = (projectedLunarXY[1] / R_MOON_METERS) * (180 / Math.PI);

                    // Нормализация долготы к диапазону -180 to +180 (или 0-360, как удобнее)
                    // lunarLon = (lunarLon % 360 + 540) % 360 - 180; // для -180 до +180
                    // lunarLon = (lunarLon % 360 + 360) % 360; // для 0 до 360

                    console.log(`Рассчитанные лунные координаты: Долгота ${lunarLon.toFixed(4)}, Широта ${lunarLat.toFixed(4)}`);

                } catch (projError) {
                    console.error("Ошибка трансформации координат клика в лунные:", projError);
                }
            } else {
                console.warn("Proj4js не определен, невозможно рассчитать лунные координаты клика.");
            }
            
            // Используем рассчитанные лунные координаты (или WGS84 если трансформация не удалась)
            const coordsForAnalysis = (lunarLon !== null && lunarLat !== null) 
                ? { lng: lunarLon, lat: lunarLat, system: 'Lunar' }
                : { lng: wgs84LngLat.lng, lat: wgs84LngLat.lat, system: 'WGS84' };

            // Передаем в функции анализа/обновления UI
            // ВАЖНО: твои функции getSimulatedSiteProperties и т.д. должны теперь ожидать
            // потенциально лунные координаты.
            if (typeof getSimulatedSiteProperties === 'function') {
                const siteData = getSimulatedSiteProperties(coordsForAnalysis); // Передаем объект с координатами и системой
                if (typeof updateInfoPanel === 'function') updateInfoPanel(siteData, coordsForAnalysis); // Передаем и для отображения
                if (typeof updateWizardStep3Coordinates === 'function') updateWizardStep3Coordinates(siteData, coordsForAnalysis);
            }
        });

        map.on('load', () => {
            console.log("Карта MapLibre загружена с двумя слоями.");
            addLayerToggleButtons(map);
        });

        map.on('error', (e) => {
            console.error("Ошибка карты MapLibre:", e);
             if (e.error && e.error.message) {
                console.error("Сообщение об ошибке карты:", e.error.message);
            }
        });
        
        map.addControl(new maplibregl.NavigationControl(), 'top-left');

        console.log("Инициализация MapLibre завершена.");
        return map;

    } catch (error) {
        console.error("Критическая ошибка при инициализации MapLibre:", error);
        const mapDiv = document.getElementById('map');
        if (mapDiv) {
            mapDiv.innerHTML = '<p style="color: red; padding: 20px;">Не удалось загрузить карту.</p>';
        }
        return null;
    }
}

// Функция для добавления кнопок переключения слоев (остается без изменений)
function addLayerToggleButtons(map) {
    const layersContainer = document.createElement('div');
    layersContainer.id = 'layer-toggle-controls';
    layersContainer.style.position = 'absolute';
    layersContainer.style.top = '10px';
    layersContainer.style.right = '10px';
    layersContainer.style.background = 'rgba(255, 255, 255, 0.8)';
    layersContainer.style.padding = '10px';
    layersContainer.style.borderRadius = '5px';
    layersContainer.style.zIndex = '100'; 

    const baseMapToggle = createToggleButton(map, 'lunar-base-layer', 'Базовая карта', true);
    const demMapToggle = createToggleButton(map, 'lunar-dem-layer', 'Карта высот (DTM)', true);

    layersContainer.appendChild(baseMapToggle);
    layersContainer.appendChild(demMapToggle);

    const mapContainer = map.getContainer();
    if (mapContainer && mapContainer.parentNode) {
         mapContainer.parentNode.appendChild(layersContainer);
    } else {
        document.body.appendChild(layersContainer);
    }
}

function createToggleButton(map, layerId, labelText, initialStateVisible) {
    const buttonContainer = document.createElement('div');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `toggle-${layerId}`;
    checkbox.checked = initialStateVisible; 

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = labelText;
    label.style.marginLeft = '5px';

    checkbox.addEventListener('change', (e) => {
        map.setLayoutProperty(layerId, 'visibility', e.target.checked ? 'visible' : 'none');
    });

    buttonContainer.appendChild(checkbox);
    buttonContainer.appendChild(label);
    return buttonContainer;
}