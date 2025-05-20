// В mapMoon.js, в глобальной области (до initializeMapLibreMap)

let lunarSurfaceDataCache = null; // Кэш для загруженных данных

async function loadLunarSurfaceData() {
    if (lunarSurfaceDataCache) {
        return lunarSurfaceDataCache; // Возвращаем из кэша, если уже загружено
    }
    try {
        // Путь к JSON файлу. Если mapMoon.js в /js, а data/ в корне, то '../data/'
        const response = await fetch('../data/lunar_surface_data.json'); 
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        lunarSurfaceDataCache = data; // Кэшируем
        console.log("Данные о поверхности Луны (JSON) загружены:", lunarSurfaceDataCache);
        return lunarSurfaceDataCache;
    } catch (error) {
        console.error("Не удалось загрузить данные о поверхности Луны (lunarSurfaceData.json):", error);
        return null;
    }
}

// Вызовем загрузку данных один раз при инициализации или первом обращении
// Лучше вызвать в initializeMapLibreMap или перед первым использованием.






// В mapMoon.js

/**
 * Рассчитывает квадрат расстояния между двумя точками (широта/долгота) на сфере.
 * Использует упрощенную формулу для малых расстояний или для сравнения.
 * Для точных расстояний нужна формула гаверсинусов.
 * @param {object} p1 - {lat, lon} в градусах
 * @param {object} p2 - {lat, lon} в градусах
 * @returns {number} Квадрат углового расстояния (приблизительно).
 */
function latLonDistanceSq(p1, p2) {
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLon = (p2.lon - p1.lon) * Math.PI / 180;
    // Простая евклидова метрика на градусах - очень грубо, но для поиска ближайшего может сработать
    // return dLat * dLat + dLon * dLon * Math.cos((p1.lat + p2.lat) * Math.PI / 360) * Math.cos((p1.lat + p2.lat) * Math.PI / 360);
    // Лучше использовать более простую метрику, если точное расстояние не так важно, как относительная близость
    return dLat * dLat + dLon * dLon; // Это квадрат расстояния в "градусном пространстве"
}


/**
 * Находит параметры ближайшей точки из JSON данных к заданным лунным координатам.
 * @param {number} targetLon - Целевая лунная долгота (градусы).
 * @param {number} targetLat - Целевая лунная широта (градусы).
 * @param {object} surfaceData - Загруженные данные из lunarSurfaceData.json.
 * @returns {object | null} Объект parameters для ближайшей точки или null.
 */
function getClosestSurfacePointParameters(targetLon, targetLat, surfaceData) {
    if (!surfaceData || !surfaceData.surface_points || surfaceData.surface_points.length === 0) {
        console.warn("Нет данных surface_points для поиска.");
        return null;
    }

    let closestPoint = null;
    let minDistanceSq = Infinity;

    for (const point of surfaceData.surface_points) {
        const distSq = latLonDistanceSq({ lat: targetLat, lon: targetLon }, { lat: point.lat, lon: point.lon });
        if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            closestPoint = point;
        }
    }

    if (closestPoint) {
        console.log(`Ближайшая точка в JSON: ${closestPoint.id} (расстояние^2: ${minDistanceSq.toFixed(5)})`);
        return closestPoint.parameters;
    }
    return null;
}







/**
 * Инициализирует карту MapLibre GL JS с WMS слоями и анализом высот/уклонов.
 * @returns {maplibregl.Map | null} Экземпляр карты или null в случае ошибки.
 */
let currentMapMarker = null;

// --- Определения проекций для Proj4js ---
const projWebMercatorDef = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs';
const projLunarTargetDef = '+proj=eqc +R=1737400 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +units=m +no_defs';
const lunarProjNameForProj4 = 'LUNAR_IAU2000_CUSTOM'; // Имя для метрической проекции, используемой для BBOX
const LUNAR_SRS_FOR_WMS_REQUEST = 'IAU2000:30166,9001,0,0'; // SRS для WMS запроса

const projLunarGeographicDef = '+proj=longlat +R=1737400 +no_defs'; // Лунная географическая (градусы)
const lunarGeographicProjName = 'LUNAR_GEOGRAPHIC_DEGREES';
const WGS84_PROJ_NAME_FOR_PROJ4 = 'EPSG:4326'; // Стандартный WGS84 для lat/lon

if (typeof proj4 !== 'undefined') {
    if (!proj4.defs('EPSG:3857')) proj4.defs('EPSG:3857', projWebMercatorDef);
    if (!proj4.defs(WGS84_PROJ_NAME_FOR_PROJ4)) proj4.defs(WGS84_PROJ_NAME_FOR_PROJ4, '+proj=longlat +datum=WGS84 +no_defs');
    if (!proj4.defs(lunarProjNameForProj4)) proj4.defs(lunarProjNameForProj4, projLunarTargetDef);
    if (!proj4.defs(lunarGeographicProjName)) proj4.defs(lunarGeographicProjName, projLunarGeographicDef); // Добавили определение для географической лунной
    console.log("Proj4js проекции определены в mapMoon.js.");
} else {
    console.error("Proj4js не определен в mapMoon.js!");
}

// --- Карта цветов для DEM LROC WAC DTM ---
const lunarDemColorMap = [
    { color: [170, 87, 220], height: -9150 },   // Фиолетовый
    { color: [56, 95, 230], height: -4170 },    // Голубой
    { color: [65, 213, 216], height: -2180 },   // Светло-голубой
    { color: [62, 214, 151], height: 0 },       // Зеленый (0м)
    { color: [65, 189, 86], height: 210 },      // Светло-зеленый
    { color: [218, 234, 36], height: 810 },     // Желтый
    { color: [243, 113, 37], height: 5780 },    // Оранжевый
    { color: [255, 80, 80], height: 10760 }     // Условный красный для пика (ЗАМЕНИ, ЕСЛИ ЕСТЬ ТОЧНЫЙ)
];
lunarDemColorMap.sort((a, b) => a.height - b.height);

function colorDistanceSq(c1, c2) {
    return Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2) + Math.pow(c1[2] - c2[2], 2);
}

function getColorToHeight(r, g, b, sortedColorMap) {
    if (!sortedColorMap || sortedColorMap.length === 0) return null;
    if (sortedColorMap.length === 1) return sortedColorMap[0].height;
    const targetColor = [r, g, b];
    let c1 = sortedColorMap[0], c2 = sortedColorMap[1];
    let d1Sq = colorDistanceSq(targetColor, c1.color);
    let d2Sq = colorDistanceSq(targetColor, c2.color);
    if (d2Sq < d1Sq) { [c1, c2] = [c2, c1]; [d1Sq, d2Sq] = [d2Sq, d1Sq]; }
    for (let i = 2; i < sortedColorMap.length; i++) {
        const distSq = colorDistanceSq(targetColor, sortedColorMap[i].color);
        if (distSq < d1Sq) {
            d2Sq = d1Sq; c2 = c1; d1Sq = distSq; c1 = sortedColorMap[i];
        } else if (distSq < d2Sq) {
            d2Sq = distSq; c2 = sortedColorMap[i];
        }
    }
    if (d1Sq === 0) return c1.height;
    const d_lower = Math.sqrt(d1Sq); const d_upper = Math.sqrt(d2Sq);
    if (d_lower + d_upper === 0) return c1.height; 
    const t = d_upper / (d_lower + d_upper);
    const interpolatedHeight = c1.height * t + c2.height * (1 - t);
    const minH = Math.min(...sortedColorMap.map(item => item.height));
    const maxH = Math.max(...sortedColorMap.map(item => item.height));
    return Math.max(minH, Math.min(maxH, interpolatedHeight));
}

async function getDemHeightAtWGS84(wgs84LngLat) {
    const LUNAR_WMS_BASE_URL_FOR_ANALYSIS = 'http://luna.iaaras.ru/?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&STYLES=';
    const DEM_LAYER_NAME_FOR_ANALYSIS = 'luna_wac_dtm';
    let lunarCoordsXY_targetProj;
    if (typeof proj4 !== 'undefined') {
        try {
            lunarCoordsXY_targetProj = proj4(WGS84_PROJ_NAME_FOR_PROJ4, lunarProjNameForProj4, [wgs84LngLat.lng, wgs84LngLat.lat]);
        } catch (e) { console.error("Ошибка Proj4 (WGS84 -> TargetLunar):", e); return { error: "Proj4 click transform error" }; }
    } else { return { error: "Proj4 not defined" }; }
    const deltaMeters = 100; 
    const lunarBboxForAnalysis = [
        lunarCoordsXY_targetProj[0] - deltaMeters, lunarCoordsXY_targetProj[1] - deltaMeters,
        lunarCoordsXY_targetProj[0] + deltaMeters, lunarCoordsXY_targetProj[1] + deltaMeters
    ].join(',');
    const requestWidth = 1; const requestHeight = 1; // Изменено с 3 пикселей
    const tileUrlForAnalysis = `${LUNAR_WMS_BASE_URL_FOR_ANALYSIS}&LAYERS=${DEM_LAYER_NAME_FOR_ANALYSIS}&SRS=${encodeURIComponent(LUNAR_SRS_FOR_WMS_REQUEST)}&BBOX=${lunarBboxForAnalysis}&WIDTH=${requestWidth}&HEIGHT=${requestHeight}`;
    try {
        const response = await fetch(tileUrlForAnalysis);
        if (!response.ok) throw new Error(`Ошибка ${response.status} загрузки DEM для точки`);
        const imageBlob = await response.blob();
        const imageBitmap = await createImageBitmap(imageBlob);
        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width; canvas.height = imageBitmap.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(imageBitmap, 0, 0);
        // const centerX = Math.floor(canvas.width / 2); 
        // const centerY = Math.floor(canvas.height / 2);
        const centerX = 0; // Так как картинка 1x1
        const centerY = 0;
        const pixelData = ctx.getImageData(centerX, centerY, 1, 1).data;
        const [r, g, b] = pixelData;
        const calculatedHeight = getColorToHeight(r, g, b, lunarDemColorMap);
        if (calculatedHeight === null) return { error: `Height undefined for RGB(${r},${g},${b})` };
        return { height: parseFloat(calculatedHeight.toFixed(0)) };
    } catch (error) {
        console.error("Ошибка при анализе DEM для точки:", error);
        return { error: error.message };
    }
}

// В mapMoon.js (после всех определений проекций и вспомогательных функций getColorToHeight, getDemHeightAtWGS84)

/**
 * Рассчитывает уклон по методу Хорна (окно 3x3), запрашивая высоты 8 соседей.
 * @param {object} centerWGS84Coords - WGS84 координаты центральной точки {lng, lat}.
 * @param {object} centerLunarCoords - Лунные географические координаты центра {lng, lat}.
 * @returns {Promise<number|null>} Угол уклона в градусах или null.
 */
async function calculateSlopeByNeighborQueries_Horn(centerWGS84Coords, centerLunarCoords) {
    if (typeof proj4 === 'undefined') {
        console.error("[calculateSlopeHorn] Proj4 не определен.");
        return null;
    }

    const R_MOON_METERS = 1737400;
    // Расстояние от центра до каждого из 8-ми соседей (по осям и диагоналям)
    // Расстояние по диагонали будет sqrt(2) * offsetDistanceMeters.
    const offsetDistanceMeters = 350.0; 

    const delta_lat_wgs84 = (offsetDistanceMeters / R_MOON_METERS) * (180.0 / Math.PI);
    const cos_center_wgs84_lat = Math.cos(centerWGS84Coords.lat * Math.PI / 180.0);
    let delta_lon_wgs84;
    if (cos_center_wgs84_lat === 0 || Math.abs(cos_center_wgs84_lat) < 0.00001) {
        delta_lon_wgs84 = delta_lat_wgs84; 
    } else {
        delta_lon_wgs84 = (offsetDistanceMeters / (R_MOON_METERS * cos_center_wgs84_lat)) * (180.0 / Math.PI);
    }

    // Координаты 8 соседей в WGS84
    const neighborWGS84Map = {
        'a': { lng: centerWGS84Coords.lng - delta_lon_wgs84, lat: centerWGS84Coords.lat + delta_lat_wgs84 }, // top-left (NW)
        'b': { lng: centerWGS84Coords.lng,                     lat: centerWGS84Coords.lat + delta_lat_wgs84 }, // top-center (N)
        'c': { lng: centerWGS84Coords.lng + delta_lon_wgs84, lat: centerWGS84Coords.lat + delta_lat_wgs84 }, // top-right (NE)
        'd': { lng: centerWGS84Coords.lng - delta_lon_wgs84, lat: centerWGS84Coords.lat },                     // middle-left (W)
      //'e': centerWGS84Coords, // центральная точка, ее высота известна
        'f': { lng: centerWGS84Coords.lng + delta_lon_wgs84, lat: centerWGS84Coords.lat },                     // middle-right (E)
        'g': { lng: centerWGS84Coords.lng - delta_lon_wgs84, lat: centerWGS84Coords.lat - delta_lat_wgs84 }, // bottom-left (SW)
        'h': { lng: centerWGS84Coords.lng,                     lat: centerWGS84Coords.lat - delta_lat_wgs84 }, // bottom-center (S)
        'i': { lng: centerWGS84Coords.lng + delta_lon_wgs84, lat: centerWGS84Coords.lat - delta_lat_wgs84 }  // bottom-right (SE)
    };

    const heightPromises = Object.values(neighborWGS84Map).map(coord => getDemHeightAtWGS84(coord));

    console.log("[calculateSlopeHorn] Запрос высот для 8 соседей...");
    const results = await Promise.all(heightPromises);
    
    const heights = {};
    const neighborKeys = Object.keys(neighborWGS84Map);
    let allHeightsValid = true;
    for (let j = 0; j < neighborKeys.length; j++) {
        const key = neighborKeys[j];
        if (results[j] && !results[j].error && results[j].height !== undefined) {
            heights[key] = results[j].height;
        } else {
            heights[key] = null;
            allHeightsValid = false;
            console.warn(`[calculateSlopeHorn] Не удалось получить высоту для соседа ${key}.`);
        }
    }

    if (!allHeightsValid) {
        console.warn("[calculateSlopeHorn] Не удалось получить высоты всех 8 соседей.");
        return null;
    }
    
    console.log(`[calculateSlopeHorn] Высоты соседей: a=${heights.a?.toFixed(1)}, b=${heights.b?.toFixed(1)}, c=${heights.c?.toFixed(1)}, d=${heights.d?.toFixed(1)}, f=${heights.f?.toFixed(1)}, g=${heights.g?.toFixed(1)}, h=${heights.h?.toFixed(1)}, i=${heights.i?.toFixed(1)}`);

    // Расстояние между пикселями для градиента (это 2 * offsetDistanceMeters)
    const pixel_spacing_x_meters = 2 * offsetDistanceMeters; 
    const pixel_spacing_y_meters = 2 * offsetDistanceMeters;
    // Примечание: для ортографической и стереографической pixel_spacing может быть разным для X и Y
    // и зависеть от положения. Для простоты пока считаем их одинаковыми и равными базе.

    if (pixel_spacing_x_meters === 0 || pixel_spacing_y_meters === 0) {
        console.warn("[calculateSlopeHorn] Нулевое расстояние для расчета уклона.");
        return 0.0;
    }

    // dz/dx = ( (c + 2f + i) - (a + 2d + g) ) / (8 * pixel_spacing_x_для_одного_шага)
    // Но так как мы берем разницу между колонками, расстояние будет pixel_spacing_x_meters
    const dz_dx = ((heights.c + 2 * heights.f + heights.i) - (heights.a + 2 * heights.d + heights.g)) / (4 * pixel_spacing_x_meters); // Делитель 4, т.к. 2f и 2d это двойной вес для центральных по оси
                                                                                                                                        // Или, если pixel_spacing_x_meters - это расстояние между крайними колонками, то делитель 2.
                                                                                                                                        // Стандартный метод Хорна делит на 8 * РАЗМЕР_ОДНОГО_ПИКСЕЛЯ.
                                                                                                                                        // У нас pixel_spacing_x_meters - это расстояние между крайними точками выборки (W и E).
                                                                                                                                        // Значит, это уже 2 * (расстояние от центра до соседа).
                                                                                                                                        // Тогда градиент по X это ( (c-a) + 2*(f-d) + (i-g) ) / (4 * pixel_spacing_x_meters_ОТ_ЦЕНТРА_ДО_СОСЕДА)
                                                                                                                                        // Или ( (c+f+i) - (a+d+g) ) / (3 * pixel_spacing_x_meters_ОТ_ЦЕНТРА_ДО_СОСЕДА) если усреднять.
    // Упрощенный расчет градиента по центральным разностям, но с учетом всех точек:
    // Сумма правых минус сумма левых, деленная на общее горизонтальное расстояние
    const Gx = (heights.c + heights.f + heights.i) - (heights.a + heights.d + heights.g);
    // Сумма нижних минус сумма верхних (помним, что ось Y в canvas вниз, но высоты абсолютные)
    // Если Y растет на север, то (g+h+i) - (a+b+c)
    const Gy = (heights.g + heights.h + heights.i) - (heights.a + heights.b + heights.c);


    // Если pixel_spacing_x_meters это расстояние между W и E (или N и S), то это 2 * offsetDistanceMeters
    // Для метода Хорна обычно используется шаг сетки (расстояние между соседними пикселями)
    // В нашем случае это `offsetDistanceMeters`
    const step = offsetDistanceMeters;

    const dz_dx_horn = ((heights.c + 2 * heights.f + heights.i) - (heights.a + 2 * heights.d + heights.g)) / (8 * step);
    const dz_dy_horn = ((heights.g + 2 * heights.h + heights.i) - (heights.a + 2 * heights.b + heights.c)) / (8 * step);


    const slopeRadians = Math.atan(Math.sqrt(dz_dx_horn * dz_dx_horn + dz_dy_horn * dz_dy_horn));
    const slopeDegrees = parseFloat((slopeRadians * (180 / Math.PI)).toFixed(1));
    
    console.log(`[calculateSlopeHorn] Расчетный уклон (метод Хорна, база ~${(2*offsetDistanceMeters).toFixed(0)}м): ${slopeDegrees}°`);
    return slopeDegrees;
}



const WGS84_LON_FOR_LUNAR_M90 = -15.7; 
const WGS84_LON_FOR_LUNAR_M45 = -11;  
const WGS84_LON_FOR_LUNAR_0   = 0.0;   
const WGS84_LON_FOR_LUNAR_P45 = 11;  
const WGS84_LON_FOR_LUNAR_P90 = 15.7;  

// Целевые лунные значения
const LUNAR_LON_M90 = -90.0;
const LUNAR_LON_M45 = -45.0;
const LUNAR_LON_0   = 0.0;
const LUNAR_LON_P45 = 45.0;
const LUNAR_LON_P90 = 90.0; 

const WGS84_LAT_FOR_LUNAR_M90 = -15.7; // Южный полюс
const WGS84_LAT_FOR_LUNAR_M45 = -11;
const WGS84_LAT_FOR_LUNAR_0   = 0.0;   // Экватор
const WGS84_LAT_FOR_LUNAR_P45 = 11;
const WGS84_LAT_FOR_LUNAR_P90 = 15.7;  // Северный полюс

const LUNAR_LAT_M90 = -90.0;
const LUNAR_LAT_M45 = -45.0;
const LUNAR_LAT_0   = 0.0;
const LUNAR_LAT_P45 = 45.0;
const LUNAR_LAT_P90 = 90.0;

function piecewiseLinearInterpolate(inputValue, observedPoints, targetPoints) {
    if (observedPoints.length !== targetPoints.length || observedPoints.length < 2) {
        console.error("Ошибка интерполяции: массивы опорных точек должны быть одинаковой длины и содержать минимум 2 элемента.");
        // Возвращаем простое линейное масштабирование по краям как fallback
        const simpleScaled = targetPoints[0] + 
            ((inputValue - observedPoints[0]) / (observedPoints[observedPoints.length-1] - observedPoints[0])) * 
            (targetPoints[targetPoints.length-1] - targetPoints[0]);
        return isNaN(simpleScaled) ? targetPoints[0] : simpleScaled;
    }

    // Если значение выходит за пределы наблюдаемого диапазона, экстраполируем по крайним сегментам
    if (inputValue <= observedPoints[0]) {
        // Экстраполяция влево
        const slope = (targetPoints[1] - targetPoints[0]) / (observedPoints[1] - observedPoints[0]);
        return targetPoints[0] + slope * (inputValue - observedPoints[0]);
    }
    if (inputValue >= observedPoints[observedPoints.length - 1]) {
        // Экстраполяция вправо
        const n = observedPoints.length;
        const slope = (targetPoints[n - 1] - targetPoints[n - 2]) / (observedPoints[n - 1] - observedPoints[n - 2]);
        return targetPoints[n - 1] + slope * (inputValue - observedPoints[n - 1]);
    }

    // Находим сегмент, в который попадает inputValue
    for (let i = 0; i < observedPoints.length - 1; i++) {
        if (inputValue >= observedPoints[i] && inputValue <= observedPoints[i + 1]) {
            // Линейная интерполяция внутри сегмента [i, i+1]
            const obsMin = observedPoints[i];
            const obsMax = observedPoints[i + 1];
            const targetMin = targetPoints[i];
            const targetMax = targetPoints[i + 1];

            if (obsMax - obsMin === 0) return targetMin; // Избегаем деления на ноль

            const ratio = (inputValue - obsMin) / (obsMax - obsMin);
            return targetMin + ratio * (targetMax - targetMin);
        }
    }
    // Если не попали ни в один сегмент (не должно случиться из-за проверок выше)
    console.warn("Интерполяция: значение не попало ни в один сегмент, возвращаем крайнее.", inputValue, observedPoints);
    return targetPoints[targetPoints.length - 1]; 
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
                    'lunar-base-wms-source': { 'type': 'raster', 'tiles': [ `${LUNAR_WMS_BASE_URL}&LAYERS=${BASE_MAP_LAYER_NAME}&SRS=EPSG%3A3857&BBOX={bbox-epsg-3857}` ], 'tileSize': 256, 'attribution': 'Base: © IAA RAS' },
                    'lunar-dem-wms-source': { 'type': 'raster', 'tiles': [ `${LUNAR_WMS_BASE_URL}&LAYERS=${DEM_MAP_LAYER_NAME}&SRS=EPSG%3A3857&BBOX={bbox-epsg-3857}` ], 'tileSize': 256, 'attribution': 'DEM: © IAA RAS' }
                },
                layers: [
                    { 'id': 'lunar-base-layer', 'type': 'raster', 'source': 'lunar-base-wms-source', 'layout': { 'visibility': 'visible' } },
                    { 'id': 'lunar-dem-layer', 'type': 'raster', 'source': 'lunar-dem-wms-source', 'layout': { 'visibility': 'visible' }, 'paint': { 'raster-opacity': 1 } }
                ]
            },
            center: [0, 0], zoom: 5, 
            minZoom: 3, maxZoom: 18,  
            renderWorldCopies: false, attributionControl: true
        });

        map.setTransformRequest((url, resourceType) => {
            if (resourceType === 'Tile' && url.includes('luna.iaaras.ru')) {
                if (typeof proj4 === 'undefined') { return { url }; }
                const bboxMatch = url.match(/BBOX=([^&]+)/);
                const maplibreSrsMatch = url.match(/SRS=([^&]+)/); 
                if (bboxMatch && bboxMatch[1] && maplibreSrsMatch && maplibreSrsMatch[1]) {
                    const maplibreSrsCode = decodeURIComponent(maplibreSrsMatch[1]);
                    const mercatorBboxStr = bboxMatch[1];
                    const mercatorCoords = mercatorBboxStr.split(',').map(Number);
                    try {
                        const p1 = proj4(maplibreSrsCode, lunarProjNameForProj4, [mercatorCoords[0], mercatorCoords[1]]);
                        const p2 = proj4(maplibreSrsCode, lunarProjNameForProj4, [mercatorCoords[2], mercatorCoords[3]]);
                        const lunarBboxValues = [ Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1]), Math.max(p1[0], p2[0]), Math.max(p1[1], p2[1]) ];
                        const lunarBboxStr = lunarBboxValues.join(',');
                        let newUrl = url.replace(/BBOX=([^&]+)/, `BBOX=${lunarBboxStr}`);
                        newUrl = newUrl.replace(/SRS=([^&]+)/, `SRS=${encodeURIComponent(LUNAR_SRS_FOR_WMS_REQUEST)}`);
                        return { url: newUrl };
                    } catch (e) { console.error("[TransformRequest] Proj4js error:", e); return { url }; }
                } else { console.warn("[TransformRequest] Could not parse BBOX/SRS."); }
            }
            return { url }; 
        });
        
        map.on('click', async (e) => {
            const clickedElement = e.originalEvent.target;
            if (clickedElement && clickedElement.closest('.custom-object-marker')) {
                console.log("Клик по существующему маркеру объекта обработан его собственным слушателем.");
                return;
            }

            const wgs84LngLat = e.lngLat; 
            console.log(`Клик MapLibre (WGS84 сырые): Lon=${wgs84LngLat.lng.toFixed(4)}, Lat=${wgs84LngLat.lat.toFixed(4)}`);

            if (currentMapMarker) currentMapMarker.remove();
            currentMapMarker = new maplibregl.Marker({ color: "#FF5733" }).setLngLat(wgs84LngLat).addTo(map);
            
            // --- КУСОЧНО-ЛИНЕЙНАЯ ИНТЕРПОЛЯЦИЯ КООРДИНАТ ---
            const observedLonPoints = [WGS84_LON_FOR_LUNAR_M90, WGS84_LON_FOR_LUNAR_M45, WGS84_LON_FOR_LUNAR_0, WGS84_LON_FOR_LUNAR_P45, WGS84_LON_FOR_LUNAR_P90];
            const targetLunarLonPoints = [LUNAR_LON_M90, LUNAR_LON_M45, LUNAR_LON_0, LUNAR_LON_P45, LUNAR_LON_P90];
            
            const observedLatPoints = [WGS84_LAT_FOR_LUNAR_M90, WGS84_LAT_FOR_LUNAR_M45, WGS84_LAT_FOR_LUNAR_0, WGS84_LAT_FOR_LUNAR_P45, WGS84_LAT_FOR_LUNAR_P90];
            const targetLunarLatPoints = [LUNAR_LAT_M90, LUNAR_LAT_M45, LUNAR_LAT_0, LUNAR_LAT_P45, LUNAR_LAT_P90];

            let lunarLon = piecewiseLinearInterpolate(wgs84LngLat.lng, observedLonPoints, targetLunarLonPoints);
            let lunarLat = piecewiseLinearInterpolate(wgs84LngLat.lat, observedLatPoints, targetLunarLatPoints);
            
            // Ограничиваем на всякий случай, хотя интерполяция должна это делать
            lunarLon = Math.max(-180, Math.min(180, lunarLon)); // Или твой целевой диапазон
            lunarLat = Math.max(-90, Math.min(90, lunarLat));
            
            const calculatedLunarCoords = { 
                lng: lunarLon, 
                lat: lunarLat, 
                system: 'Lunar' 
            };
            console.log(`Кусочно-масштабированные лунные: Lon ${calculatedLunarCoords.lng.toFixed(4)}, Lat ${calculatedLunarCoords.lat.toFixed(4)}`);


            
            if (typeof showLoadingIndicator === 'function') showLoadingIndicator(true);

            // 1. Загружаем (или берем из кэша) данные о поверхности из JSON
            let additionalParams = null;
            if (typeof loadLunarSurfaceData === 'function' && typeof getClosestSurfacePointParameters === 'function' && calculatedLunarCoords.system.startsWith('Lunar')) {
                const surfaceDataJSON = await loadLunarSurfaceData();
                if (surfaceDataJSON) {
                    additionalParams = getClosestSurfacePointParameters(calculatedLunarCoords.lng, calculatedLunarCoords.lat, surfaceDataJSON);
                }
            } else if (!calculatedLunarCoords.system.startsWith('Lunar')) {
                console.warn("Не удалось рассчитать лунные координаты, данные из JSON не будут запрошены.");
            }


            // 2. Получаем высоту для точки клика (используя исходные WGS84 для запроса)
            const heightResult = await getDemHeightAtWGS84(wgs84LngLat);
            let slopeResult = null;

            // 3. Если высота получена, рассчитываем уклон
            if (heightResult && !heightResult.error && heightResult.height !== undefined) {
                // Для calculateSlopeByNeighborQueries_Horn нужны WGS84 центра и лунные координаты центра
                slopeResult = await calculateSlopeByNeighborQueries_Horn(
                    wgs84LngLat,
                    calculatedLunarCoords, // Передаем лунные координаты центра
                    // heightResult.height // Больше не нужен, если Хорн его не использует
                );
            }
            
            if (typeof showLoadingIndicator === 'function') showLoadingIndicator(false);
            

            // 4. Формируем итоговый объект siteDataForUI
            let siteDataForUI = { 
                clickedLngLat: calculatedLunarCoords,
                absoluteElevation: (heightResult && !heightResult.error) ? heightResult.height : undefined,
                relief: { 
                    slope_calculated_value: slopeResult,
                    slope_display_text: "Уклон: Н/Д",
                    flatnessText: "Н/Д", 
                    flatnessIndicator: "grey-color" 
                },
                radiation: { // Обновляем структуру для радиации
                    protectionText: "Радиация: Н/Д", // Будет сформировано ниже
                    gcr_avg_text: "ГКЛ: Н/Д",
                    spe_risk_text: "СПС риск: Н/Д",
                    indicator: "grey-color"
                },
                safety: { 
                    seismicText: `Сейсмика: ${additionalParams ? additionalParams.seismic_activity : 'Н/Д'}`, 
                    seismicIndicator: "grey-color",
                    meteorText: `Метеориты: ${additionalParams ? additionalParams.meteorite_hazard : 'Н/Д'}`, 
                    meteorIndicator: "grey-color"
                 },
                overallSuitabilityText: "Анализ...",
                isGenerallySuitable: false,
                detailedDescription: `Координаты: Lat ${calculatedLunarCoords.lat.toFixed(4)}, Lon ${calculatedLunarCoords.lng.toFixed(4)} (${calculatedLunarCoords.system})`,
                statusIcon: "images/place-bad.svg"
            };

            // --- Логика определения пригодности и заполнения UI ---
            let slopeIsGood = false, slopeIsAcceptable = false;
            let radiationIsGood = false, radiationIsAcceptable = false; // Теперь для общей оценки радиации
            let seismicIsGood = false, seismicIsAcceptable = false;
            let meteorIsGood = false, meteorIsAcceptable = false; // Теперь для общей метеоритной

            if (siteDataForUI.absoluteElevation === undefined && !(heightResult && heightResult.error) ) { // Если не было ошибки, но и высоты нет
                siteDataForUI.overallSuitabilityText = "Участок не пригоден (нет данных о высоте)";
                siteDataForUI.detailedDescription += " Ошибка определения высоты.";
            } else if (heightResult && heightResult.error) {
                 siteDataForUI.overallSuitabilityText = `Участок не пригоден (${heightResult.error})`;
                 siteDataForUI.detailedDescription += ` Ошибка: ${heightResult.error}.`;
            }
            else { // Высота есть
                // Обработка уклона (как раньше)
                if (slopeResult !== null && slopeResult !== undefined) {
                    const slopeDeg = slopeResult;
                    // ... (логика для slope_display_text, flatnessText, flatnessIndicator, slopeIsGood, slopeIsAcceptable как раньше)
                    if (slopeDeg < 3) { siteDataForUI.relief.slope_display_text = `Незначительный (< 3°)`; siteDataForUI.relief.flatnessText = "Ровная площадка"; siteDataForUI.relief.flatnessIndicator = "green-color"; slopeIsGood = true; slopeIsAcceptable = true; }
                    else if (slopeDeg < 12) { siteDataForUI.relief.slope_display_text = `Умеренный (3°-12°)`; siteDataForUI.relief.flatnessText = "Умеренный уклон"; siteDataForUI.relief.flatnessIndicator = "yellow-color"; slopeIsGood = false; slopeIsAcceptable = true; }
                    else { siteDataForUI.relief.slope_display_text = `Значительный (> 12°)`; siteDataForUI.relief.flatnessText = "Значительный уклон"; siteDataForUI.relief.flatnessIndicator = "red-color"; slopeIsGood = false; slopeIsAcceptable = false; }
                } else {
                    siteDataForUI.relief.slope_display_text = "Уклон: Н/Д";
                }

                // Обработка данных из JSON (additionalParams) с новыми именами
                if (additionalParams) {
                    // Радиация
                    const radGCR = additionalParams.radiation_gcr_avg;
                    const radSPE = additionalParams.radiation_spe_risk;
                    siteDataForUI.radiation.gcr_avg_text = radGCR !== undefined ? `ГКЛ: ${radGCR} мкЗв/д` : "ГКЛ: Н/Д";
                    siteDataForUI.radiation.spe_risk_text = radSPE ? `СПС риск: ${radSPE}` : "СПС риск: Н/Д";
                    
                    let currentRadiationLevelText = "Н/Д";
                    if (radGCR !== undefined) { // Оцениваем общую радиационную обстановку
                        if (radGCR < 350 && (radSPE === "Низкий" || !radSPE)) {
                            currentRadiationLevelText = "Низкая";
                            siteDataForUI.radiation.indicator = "green-color";
                            radiationIsGood = true; radiationIsAcceptable = true;
                        } else if (radGCR < 500 && (radSPE === "Низкий" || radSPE === "Средний" || !radSPE)) {
                            currentRadiationLevelText = "Средняя";
                            siteDataForUI.radiation.indicator = "yellow-color";
                            radiationIsGood = false; radiationIsAcceptable = true;
                        } else {
                            currentRadiationLevelText = "Высокая";
                            siteDataForUI.radiation.indicator = "red-color";
                            radiationIsGood = false; radiationIsAcceptable = false;
                        }
                    }
                    siteDataForUI.radiation.protectionText = `Радиация: ${currentRadiationLevelText}`;


                    // Сейсмика
                    const seisActivity = additionalParams.seismic_activity;
                    if (seisActivity) {
                        siteDataForUI.safety.seismicText = `Сейсмическая активность: ${seisActivity}`;
                        if (seisActivity.toLowerCase().includes("низкая")) { // Включая "очень низкая"
                            siteDataForUI.safety.seismicIndicator = "green-color";
                            seismicIsGood = true; seismicIsAcceptable = true;
                        } else if (seisActivity.toLowerCase() === "средняя") {
                            siteDataForUI.safety.seismicIndicator = "yellow-color";
                            seismicIsGood = false; seismicIsAcceptable = true;
                        } else { // Высокая
                            siteDataForUI.safety.seismicIndicator = "red-color";
                            seismicIsGood = false; seismicIsAcceptable = false;
                        }
                    }

                    // Метеориты
                    const meteorHazard = additionalParams.meteorite_hazard;
                     if (meteorHazard) {
                        siteDataForUI.safety.meteorText = `Метеоритная опасность: ${meteorHazard}`; // Убрал (м)
                        if (meteorHazard.toLowerCase() === "низкая") {
                            siteDataForUI.safety.meteorIndicator = "green-color";
                            meteorIsGood = true; meteorIsAcceptable = true;
                        } else if (meteorHazard.toLowerCase() === "средняя") {
                            siteDataForUI.safety.meteorIndicator = "yellow-color";
                            meteorIsGood = false; meteorIsAcceptable = true;
                        } else { // Высокая
                            siteDataForUI.safety.meteorIndicator = "red-color";
                            meteorIsGood = false; meteorIsAcceptable = false;
                        }
                    }
                }

                // Определение общей пригодности
                if (slopeIsAcceptable && radiationIsAcceptable && seismicIsAcceptable && meteorIsAcceptable) {
                    if (slopeIsGood && radiationIsGood && seismicIsGood && meteorIsGood) {
                        siteDataForUI.overallSuitabilityText = "Участок полностью пригоден";
                    } else {
                        siteDataForUI.overallSuitabilityText = "Участок условно пригоден";
                    }
                    siteDataForUI.isGenerallySuitable = true;
                    siteDataForUI.statusIcon = "images/place-ok.svg";
                } else {
                    siteDataForUI.overallSuitabilityText = "Участок не пригоден";
                    siteDataForUI.isGenerallySuitable = false;
                    siteDataForUI.statusIcon = "images/place-bad.svg";
                    let reasons = [];
                    if (!slopeIsAcceptable) reasons.push("высокий уклон");
                    if (!radiationIsAcceptable) reasons.push("высокая радиация");
                    if (!seismicIsAcceptable) reasons.push("высокая сейсмика");
                    if (!meteorIsAcceptable) reasons.push("высокая метеоритная опасность");
                    siteDataForUI.detailedDescription += ` Причины: ${reasons.join(', ')}.`;
                }
            }
            // Обновляем главный статус текстом общей пригодности
            siteDataForUI.statusText = siteDataForUI.overallSuitabilityText;
            
            // ... (вызовы updateInfoPanel, updateWizardStep3Coordinates) ...
            if (typeof updateInfoPanel === 'function') updateInfoPanel(siteDataForUI, calculatedLunarCoords);
            if (typeof updateWizardStep3Coordinates === 'function') updateWizardStep3Coordinates(siteDataForUI, calculatedLunarCoords, wgs84LngLat);
        });

        map.on('load', () => { console.log("Карта MapLibre загружена."); if (typeof addLayerToggleButtons === 'function') addLayerToggleButtons(map); if (typeof showLoadingIndicator === 'function') showLoadingIndicator(false); });
        map.on('error', (e) => console.error("Ошибка карты MapLibre:", e));
        map.addControl(new maplibregl.NavigationControl(), 'top-left');
        return map;
    } catch (error) { 
        console.error("Критическая ошибка при инициализации MapLibre:", error);
        const mapDiv = document.getElementById('map');
        if (mapDiv) mapDiv.innerHTML = '<p style="color: red; padding: 20px;">Не удалось загрузить карту.</p>';
        return null;
    }
}

function addLayerToggleButtons(map) {
    const layersContainer = document.createElement('div');
    layersContainer.id = 'layer-toggle-controls';
    layersContainer.style.position = 'absolute'; layersContainer.style.top = '87%'; layersContainer.style.left = '30px';
    layersContainer.style.background = 'rgba(255, 255, 255, 1)'; layersContainer.style.padding = '15px';
    layersContainer.style.borderRadius = '10px'; layersContainer.style.zIndex = '100'; 
    // const baseMapToggle = createToggleButton(map, 'lunar-base-layer', 'Базовая карта', true);
    const demMapToggle = createToggleButton(map, 'lunar-dem-layer', 'Карта высот (DTM)', true);
    // layersContainer.appendChild(baseMapToggle); 
    layersContainer.appendChild(demMapToggle);
    const mapContainer = map.getContainer();
    if (mapContainer && mapContainer.parentNode) { mapContainer.parentNode.appendChild(layersContainer); } 
    else { document.body.appendChild(layersContainer); }
}

function createToggleButton(map, layerId, labelText, initialStateVisible) {
    const buttonContainer = document.createElement('div');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.id = `toggle-${layerId}`; checkbox.checked = initialStateVisible; 
    const label = document.createElement('label');
    label.htmlFor = checkbox.id; label.textContent = labelText; label.style.marginLeft = '10px';
    checkbox.addEventListener('change', (e) => {
        map.setLayoutProperty(layerId, 'visibility', e.target.checked ? 'visible' : 'none');
    });
    buttonContainer.appendChild(checkbox); buttonContainer.appendChild(label);
    return buttonContainer;
}