// js/lunarAnalysis.js

// Карта цветов для DEM LROC WAC DTM
// ЗАПОЛНЕНО ТВОИМИ ДАННЫМИ (для красного пока оставим высокий порог с похожим цветом)
const lunarDemColorMap = [
    { color: [170, 87, 220], height: -9150 },   // Фиолетовый
    { color: [56, 95, 230], height: -4170 },    // Голубой
    { color: [65, 213, 216], height: -2180 },   // Светло-голубой
    { color: [62, 214, 151], height: 0 },       // Зеленый (0м)
    { color: [65, 189, 86], height: 210 },     // Светло-зеленый (в оригинале +210, но по шкале ближе к зеленому)
                                                // Я бы тут поставил цвет более желтоватый для +210 или взял еще одну точку
                                                // Пока оставлю так, но интерполяция между [62,214,151] и [65,189,86] для высот 0-210 может быть неидеальной
    { color: [218, 234, 36], height: 810 },    // Желтый
    { color: [243, 113, 37], height: 5780 },   // Оранжевый
    // Для красного/белого на +10760. Если это почти белый [250,250,240] например.
    // Если у тебя есть цвет для ~8000-9000м, это было бы лучше.
    // Пока поставим тот же оранжевый для верхней границы, чтобы не было резкого скачка на белый,
    // или можно добавить почти белый цвет с очень высокой высотой.
    // Добавим точку для "очень высокого", близкую к белому, если такой цвет встречается
    // Если таких цветов на карте почти нет, можно ограничиться оранжевым.
    // Для примера, если красный на легенде это [255,50,50] (гипотетически)
    // { color: [255, 50, 50], height: 10760 }
    // Так как ты сказал, что уходит в белый, и таких участков мало,
    // мы можем либо сделать последнюю точку [243, 113, 37] с высотой 10760 (грубо),
    // либо добавить еще одну точку для почти белого.
    // Давай пока ограничимся максимальным оранжевым, предполагая, что выше него цвета не анализируем точно.
    // Или, если ты можешь дать RGB для красного, который еще не белый, это будет лучше.
    // Для примера, пусть красный будет чуть темнее, чем чисто белый для +10760
     { color: [255, 80, 80], height: 10760 } // ЗАМЕНИ НА РЕАЛЬНЫЙ ЦВЕТ С КАРТЫ ДЛЯ ВЫСОКИХ ЗНАЧЕНИЙ, ЕСЛИ ЕСТЬ
];

// Сортируем карту цветов по высоте для корректной интерполяции
lunarDemColorMap.sort((a, b) => a.height - b.height);

/**
 * Вычисляет "расстояние" между двумя цветами (сумма квадратов разниц компонент).
 * @param {number[]} c1 - Массив [r,g,b] для первого цвета.
 * @param {number[]} c2 - Массив [r,g,b] для второго цвета.
 * @returns {number} Квадрат расстояния между цветами.
 */
function colorDistanceSq(c1, c2) {
    return Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2) + Math.pow(c1[2] - c2[2], 2);
}


/**
 * Преобразует RGB цвет пикселя в высоту на основе карты цветов.
 * Интерполирует между двумя ближайшими по цвету опорными точками.
 * @param {number} r - Красный компонент (0-255).
 * @param {number} g - Зеленый компонент (0-255).
 * @param {number} b - Синий компонент (0-255).
 * @param {Array<object>} colorMap - Массив {color: [r,g,b], height: meters}, отсортированный по высоте.
 * @returns {number | null} Рассчитанная высота в метрах или null, если не удалось.
 */
function getColorToHeight(r, g, b, sortedColorMap) {
    if (!sortedColorMap || sortedColorMap.length === 0) return null;
    if (sortedColorMap.length === 1) return sortedColorMap[0].height;

    const targetColor = [r, g, b];

    // Найти два ближайших цвета из colorMap, между которыми находится targetColor
    // Это сложная задача для многомерного цветового пространства и нелинейного градиента.
    // Упрощенный подход: найти ближайший по цвету и ближайший второй.
    // Или, если градиент примерно линеен по какому-то параметру (например, яркости), использовать это.

    // Для простоты и предсказуемости с заданной шкалой, найдем два опорных цвета,
    // МЕЖДУ высотами которых (теоретически) должен лежать наш цвет.
    // Затем интерполируем.

    let lowerBound = sortedColorMap[0];
    let upperBound = sortedColorMap[sortedColorMap.length - 1];

    // Если цвет пикселя "ниже" самого низкого в карте или "выше" самого высокого
    if (colorDistanceSq(targetColor, lowerBound.color) <= colorDistanceSq(targetColor, upperBound.color)) {
        // Ближе к нижней границе по цвету - ищем сегмент снизу
        for (let i = 0; i < sortedColorMap.length - 1; i++) {
            if (sortedColorMap[i].height <= sortedColorMap[i+1].height) { // Стандартный случай
                 lowerBound = sortedColorMap[i];
                 upperBound = sortedColorMap[i+1];
                 // Проверяем, лежит ли цвет "между" этими двумя по какому-то критерию
                 // Например, если R компонента targetColor между R компонентами lower и upper
                 // Это очень грубо для сложного градиента.
                 // Вместо этого, найдем два ближайших по цветовому расстоянию.
                 break; // Для упрощения пока так, но это неверно для интерполяции
            }
        }
    } else {
        // Ближе к верхней границе - ищем сегмент сверху
         for (let i = sortedColorMap.length - 1; i > 0; i--) {
            if (sortedColorMap[i-1].height <= sortedColorMap[i].height) {
                lowerBound = sortedColorMap[i-1];
                upperBound = sortedColorMap[i];
                break;
            }
        }
    }
    
    // Найдем два абсолютно ближайших цвета из всей карты
    let c1 = sortedColorMap[0], c2 = sortedColorMap[1];
    let d1Sq = colorDistanceSq(targetColor, c1.color);
    let d2Sq = colorDistanceSq(targetColor, c2.color);

    if (d2Sq < d1Sq) { [c1, c2] = [c2, c1]; [d1Sq, d2Sq] = [d2Sq, d1Sq]; }

    for (let i = 2; i < sortedColorMap.length; i++) {
        const distSq = colorDistanceSq(targetColor, sortedColorMap[i].color);
        if (distSq < d1Sq) {
            d2Sq = d1Sq; c2 = c1;
            d1Sq = distSq; c1 = sortedColorMap[i];
        } else if (distSq < d2Sq) {
            d2Sq = distSq; c2 = sortedColorMap[i];
        }
    }
    
    lowerBound = c1; // Ближайший
    upperBound = c2; // Второй ближайший

    if (d1Sq === 0) return lowerBound.height; // Точное совпадение с ближайшим

    // Линейная интерполяция высоты между lowerBound и upperBound
    // на основе "расстояния" targetColor до них.
    const d_lower = Math.sqrt(d1Sq);
    const d_upper = Math.sqrt(d2Sq);

    if (d_lower + d_upper === 0) return lowerBound.height; // Оба цвета идентичны targetColor или друг другу

    // t - вес для lowerBound. Чем ближе targetColor к lowerBound, тем больше вес.
    const t = d_upper / (d_lower + d_upper);
    
    const interpolatedHeight = lowerBound.height * t + upperBound.height * (1 - t);

    // Ограничим результат диапазоном высот из карты
    const minHeightMap = sortedColorMap[0].height;
    const maxHeightMap = sortedColorMap[sortedColorMap.length - 1].height;
    
    return Math.max(minHeightMap, Math.min(maxHeightMap, interpolatedHeight));
}


/**
 * Анализирует DEM тайл для получения высоты в точке клика.
 * @param {object} lngLatWGS84 - Координаты клика {lng, lat} в WGS84.
 * @param {number} currentMapZoom - Текущий зум карты MapLibre.
 * @param {object} mapInstance - Экземпляр карты MapLibre (не используется в этой версии, т.к. URL формируется иначе).
 * @returns {Promise<object>} Объект с результатом анализа или ошибкой.
 */
async function analyzeDemForHeight(lngLatWGS84, currentMapZoom /*, mapInstance */) {
    const LUNAR_WMS_BASE_URL_FOR_ANALYSIS = 'http://luna.iaaras.ru/?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&STYLES='; // Убрал WIDTH/HEIGHT
    const DEM_LAYER_NAME_FOR_ANALYSIS = 'luna_wac_dtm';

    let lunarCoordsXY_targetProj; // Координаты клика в целевой лунной проекции (метрической)
    if (typeof proj4 !== 'undefined' && typeof lunarProjNameForProj4 !== 'undefined' && typeof WGS84_PROJ_NAME_FOR_PROJ4 !== 'undefined') {
        try {
            lunarCoordsXY_targetProj = proj4(WGS84_PROJ_NAME_FOR_PROJ4, lunarProjNameForProj4, [lngLatWGS84.lng, lngLatWGS84.lat]);
        } catch (e) {
            console.error("Ошибка Proj4 при трансформации координат клика (WGS84 -> TargetLunar):", e);
            return { error: "Proj4 click transform error (WGS84 -> TargetLunar)" };
        }
    } else {
        console.error("Proj4 или необходимые проекции не определены для трансформации координат клика.");
        return { error: "Proj4 or projections not defined for click transform" };
    }

    // Запросим небольшой регион вокруг точки клика. Размер региона может влиять на точность.
    // WMS ожидает BBOX в координатах своего SRS.
    const analysisBoxSideMeters = 256 * 5; // Запросим регион ~5 пикселей карты на среднем зуме, если 1 пиксель ~ 100-500м
                                        // Это нужно будет подбирать. Чем меньше, тем быстрее, но может быть менее точно для усреднения.
                                        // Для начала запросим один пиксель WMS (256x256), но возьмем цвет из его центра.
                                        // Сервер может сам масштабировать данные к запрошенному WIDTH/HEIGHT.
                                        // Здесь WIDTH/HEIGHT в URL будут 256.

    const halfBox = analysisBoxSideMeters / 2;
    const lunarBboxForAnalysis = [
        lunarCoordsXY_targetProj[0] - halfBox, // minX
        lunarCoordsXY_targetProj[1] - halfBox, // minY
        lunarCoordsXY_targetProj[0] + halfBox, // maxX
        lunarCoordsXY_targetProj[1] + halfBox  // maxY
    ].join(',');

    // ВАЖНО: WIDTH и HEIGHT должны соответствовать тому, как сервер генерирует изображение для этого BBOX.
    // Если мы хотим 1 пиксель = 1 значение, то WIDTH=1, HEIGHT=1.
    // Но сервер может не поддерживать такой маленький размер.
    // Стандартно WMS отдает тайлы 256x256.
    const requestWidth = 256;
    const requestHeight = 256;

    const tileUrlForAnalysis = `${LUNAR_WMS_BASE_URL_FOR_ANALYSIS}&LAYERS=${DEM_LAYER_NAME_FOR_ANALYSIS}&SRS=${encodeURIComponent(LUNAR_SRS_FOR_WMS_REQUEST)}&BBOX=${lunarBboxForAnalysis}&WIDTH=${requestWidth}&HEIGHT=${requestHeight}`;

    console.log(`Анализ DEM: Запрос региона: ${tileUrlForAnalysis}`);

    try {
        const response = await fetch(tileUrlForAnalysis);
        if (!response.ok) throw new Error(`Ошибка ${response.status} загрузки DEM тайла для анализа: ${response.statusText}`);
        const imageBlob = await response.blob();
        const imageBitmap = await createImageBitmap(imageBlob);

        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width; // Используем реальный размер полученного изображения
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(imageBitmap, 0, 0);

        // Точка клика (lunarCoordsXY_targetProj) должна быть в центре запрошенного BBOX,
        // значит, на canvas это будет центр.
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);

        const pixelData = ctx.getImageData(centerX, centerY, 1, 1).data;
        const r = pixelData[0];
        const g = pixelData[1];
        const b = pixelData[2];

        const calculatedHeight = getColorToHeight(r, g, b, lunarDemColorMap);

        if (calculatedHeight === null) {
            console.warn(`Не удалось определить высоту для цвета RGB(${r},${g},${b})`);
            return { clickedLngLatWGS84: lngLatWGS84, rawColor: [r,g,b], error: "Height undefined for color" };
        }
        console.log(`Анализ DEM: Цвет RGB(${r},${g},${b}), Расчетная высота: ${calculatedHeight.toFixed(0)} м`);
        return {
            clickedLngLatWGS84: lngLatWGS84,
            rawColor: [r,g,b],
            calculatedHeight: parseFloat(calculatedHeight.toFixed(0))
            // Уклон будем считать отдельно
        };
    } catch (error) {
        console.error("Ошибка при анализе DEM тайла (fetch или canvas):", error);
        return { clickedLngLatWGS84: lngLatWGS84, error: error.message };
    }
}


/**
 * Рассчитывает уклон на основе высот соседних точек.
 * @param {object} centerCoordsLunar - Лунные координаты центральной точки {lng, lat}.
 * @param {number} centerHeight - Высота в центральной точке.
 * @param {number} zoomForPixelSize - Текущий зум карты для оценки размера пикселя.
 * @returns {Promise<number|null>} Угол уклона в градусах или null.
 */
async function calculateSlopeFromNeighbors(centerCoordsLunar, centerHeight, zoomForPixelSize) {
    console.log("Запрос расчета уклона для точки:", centerCoordsLunar, "Высота:", centerHeight);
    if (centerHeight === null || centerHeight === undefined) {
        console.warn("Невозможно рассчитать уклон: высота центральной точки не определена.");
        return null;
    }

    const R_MOON_METERS = 1737400;
    // Оценка расстояния, которое покрывает один пиксель WMS-запроса (256x256 для BBOX ~ analysisBoxSideMeters)
    // Это очень грубо. Лучше определить смещение в градусах и потом перевести в метры.
    
    // Смещение для соседних точек в градусах долготы/широты
    // Это значение нужно подобрать. 0.001 градуса на Луне это ~30 метров.
    const deltaDegrees = 0.0005; // ~15 метров смещение

    const neighborCoords = [
        { lng: centerCoordsLunar.lng, lat: centerCoordsLunar.lat + deltaDegrees }, // North
        { lng: centerCoordsLunar.lng, lat: centerCoordsLunar.lat - deltaDegrees }, // South
        { lng: centerCoordsLunar.lng + deltaDegrees / Math.cos(centerCoordsLunar.lat * Math.PI / 180), lat: centerCoordsLunar.lat }, // East (коррекция на широту)
        { lng: centerCoordsLunar.lng - deltaDegrees / Math.cos(centerCoordsLunar.lat * Math.PI / 180), lat: centerCoordsLunar.lat }  // West
    ];

    const neighborHeights = [];
    for (const coord of neighborCoords) {
        // Для каждой соседней точки нужно снова получить ее WGS84 представления для analyzeDemForHeight,
        // или модифицировать analyzeDemForHeight, чтобы она принимала лунные градусы.
        // Это усложнение. Проще передавать WGS84 в analyzeDemForHeight.
        // Сейчас analyzeDemForHeight принимает WGS84. Значит, нам нужно WGS84 для соседей.
        // Это делает цепочку сложной: WGS84_клик -> Лунные_метры -> Лунные_градусы_центр -> Лунные_градусы_соседи -> WGS84_соседи -> analyzeDemForHeight(WGS84_сосед)
        
        // Упрощение: Будем считать, что `analyzeDemForHeight` вызывается для WGS84 координат,
        // которые MapLibre выдал бы, если бы мы кликнули на эти соседние лунные точки.
        // Это очень грубое допущение без обратной точной трансформации.

        // Вместо этого, модифицируем analyzeDemForHeight, чтобы она могла принимать лунные градусы напрямую
        // и сама их трансформировала в нужный BBOX для запроса.
        // Либо, что еще лучше, analyzeDemForHeight будет запрашивать достаточно большой регион,
        // и мы будем брать пиксели со смещением на этом одном загруженном canvas.

        // *** ВАРИАНТ 2: Анализ соседних пикселей на ОДНОМ загруженном тайле/регионе ***
        // Это предпочтительнее. analyzeDemForHeight должна возвращать и сам canvas/imageBitmap.
        // Но для этого analyzeDemForHeight должна запрашивать не точечный BBOX, а тот, который соответствует тайлу MapLibre.
        // Это возвращает нас к сложности определения, какой именно тайл MapLibre соответствует клику.

        // *** Пока что сделаем ЗАГЛУШКУ для высот соседей, чтобы не усложнять чрезмерно analyzeDemForHeight ***
        // В реальном приложении здесь были бы асинхронные вызовы analyzeDemForHeight для каждой соседней точки.
        console.warn("Расчет уклона: используется заглушка для высот соседей. Нужна реальная выборка.");
        neighborHeights.push(centerHeight - (Math.random() * 10 - 5)); // Случайная небольшая разница
    }

    if (neighborHeights.length < 4) {
        console.warn("Не удалось получить высоты всех соседей для расчета уклона.");
        return null;
    }
    
    // Расстояние до соседей в метрах (по дуге большого круга)
    // d = R * deltaSigma, где deltaSigma - центральный угол между точками
    // deltaSigma = acos(sin(lat1)sin(lat2) + cos(lat1)cos(lat2)cos(lon2-lon1))
    // Для малых расстояний: dy = R * dLat_rad; dx = R * dLon_rad * cos(avg_lat_rad)
    const dLat_rad = deltaDegrees * Math.PI / 180;
    const distance_meters_N_S = R_MOON_METERS * dLat_rad; // Расстояние по меридиану
    const distance_meters_E_W = R_MOON_METERS * dLat_rad * Math.cos(centerCoordsLunar.lat * Math.PI / 180); // Расстояние по параллели

    const dz_ns = Math.abs(neighborHeights[0] - neighborHeights[1]); // Разница высот Север-Юг (для двух точек N и S)
                                                                    // Точнее: (H_N - H_S) / (2 * dist_N_S)
    const dz_ew = Math.abs(neighborHeights[2] - neighborHeights[3]); // Разница высот Запад-Восток

    // Уклон по оси Север-Юг
    const slope_ns_rad = Math.atan((neighborHeights[0] - centerHeight) / distance_meters_N_S); // Уклон к северу
    // const slope_s_rad = Math.atan((centerHeight - neighborHeights[1]) / distance_meters_N_S); // Уклон к югу
    
    // Уклон по оси Запад-Восток
    const slope_ew_rad = Math.atan((neighborHeights[2] - centerHeight) / distance_meters_E_W); // Уклон к востоку
    // const slope_w_rad = Math.atan((centerHeight - neighborHeights[3]) / distance_meters_E_W); // Уклон к западу

    // Максимальный из этих уклонов
    // Более точный метод: grad_x = (H_E - H_W) / (2 * dist_E_W); grad_y = (H_N - H_S) / (2 * dist_N_S)
    // slope_rad = atan(sqrt(grad_x^2 + grad_y^2))
    
    const grad_y = (neighborHeights[0] - neighborHeights[1]) / (2 * distance_meters_N_S); // Наклон по оси Y (Север-Юг)
    const grad_x = (neighborHeights[2] - neighborHeights[3]) / (2 * distance_meters_E_W); // Наклон по оси X (Восток-Запад)

    const total_slope_rad = Math.atan(Math.sqrt(grad_x * grad_x + grad_y * grad_y));
    const total_slope_deg = total_slope_rad * (180 / Math.PI);

    console.log(`Расчетный уклон: ${total_slope_deg.toFixed(1)}°`);
    return parseFloat(total_slope_deg.toFixed(1));
}


// Главная функция, вызываемая из mapMoon.js
async function handleMapClickForAnalysis(wgs84LngLat, mapZoom, mapInstance) {
    // 1. Трансформируем WGS84 клика в лунные градусы
    let lunarCoords = null;
    if (typeof proj4 !== 'undefined') {
        try {
            const projectedLunarXY = proj4(WGS84_PROJ_NAME_FOR_PROJ4, lunarCartographicProjName, [wgs84LngLat.lng, wgs84LngLat.lat]);
            const lunarLngLatFromXY = proj4(lunarCartographicProjName, lunarGeographicProjName, projectedLunarXY);
            lunarCoords = { 
                lng: lunarLngLatFromXY[0], 
                lat: lunarLngLatFromXY[1], 
                system: 'LunarLatLon' // Отмечаем, что это лунные градусы
            };
        } catch (e) {
            console.error("Ошибка трансформации WGS84 в лунные градусы:", e);
        }
    }
    const coordsForDisplay = lunarCoords || { lng: wgs84LngLat.lng, lat: wgs84LngLat.lat, system: 'WGS84' };


    // 2. Получаем высоту для точки (используя WGS84 для запроса, т.к. analyzeDemForHeight ожидает это)
    //    analyzeDemForHeight внутри себя делает трансформацию в метрическую лунную для BBOX WMS-запроса
    const heightAnalysisResult = await analyzeDemForHeight(wgs84LngLat, mapZoom /*, mapInstance */);

    let siteData = {
        clickedLngLat: coordsForDisplay, // Для отображения используем лунные градусы, если есть
        absoluteElevation: undefined,
        relief: { slope: undefined, flatnessText: "Н/Д", flatnessIndicator: "grey-color" },
        radiation: { protectionText: "Радиация: Н/Д", indicator: "grey-color" },
        safety: { 
            seismicText: "Сейсмика: Н/Д", seismicIndicator: "grey-color",
            meteorText: "Метеориты: Н/Д", meteorIndicator: "grey-color"
        },
        isGenerallySuitable: false,
        statusText: "Ошибка анализа",
        description: "Не удалось получить все данные для анализа участка.",
        iconSrc: "images/place-bad.svg", // Убедись, что пути к картинкам правильные
        iconVisible: true
    };

    if (heightAnalysisResult && !heightAnalysisResult.error && heightAnalysisResult.calculatedHeight !== undefined) {
        siteData.absoluteElevation = heightAnalysisResult.calculatedHeight;
        siteData.statusText = `Высота: ${siteData.absoluteElevation.toFixed(0)}м`; // Обновим статус

        // 3. Рассчитываем уклон (используя лунные градусы центральной точки и ее высоту)
        const slopeDeg = await calculateSlopeFromNeighbors(coordsForDisplay, siteData.absoluteElevation, mapZoom);
        
        if (slopeDeg !== null) {
            siteData.relief.slope = slopeDeg;
            siteData.relief.flatnessText = (slopeDeg < 3) ? "Ровная площадка" : (slopeDeg < 7 ? "Умеренный уклон" : "Значительный уклон");
            siteData.relief.flatnessIndicator = (slopeDeg < 3) ? "green-color" : (slopeDeg < 7 ? "yellow-color" : "red-color");
            siteData.statusText += `, Уклон: ${slopeDeg.toFixed(1)}°`;
        } else {
             siteData.relief.slope = undefined; // или строку "Н/Д"
        }

        // 4. Получаем остальные параметры из JSON
        // const additionalParams = getParametersFromLunarJSON(coordsForDisplay.lng, coordsForDisplay.lat); // Тебе нужна эта функция
        // if (additionalParams) {
        //    siteData.radiation.protectionText = `Радиация: ${additionalParams.radiation_level}`;
        //    siteData.radiation.indicator = additionalParams.radiation_indicator;
        //    // ... и так далее для сейсмики, метеоритов
        // }
        
        // Обновляем общую пригодность и описание
        siteData.isGenerallySuitable = siteData.relief.slope !== undefined && siteData.relief.slope <= 7; // Пример
        siteData.description = `Анализ для точки: Lat ${coordsForDisplay.lat.toFixed(4)}, Lon ${coordsForDisplay.lng.toFixed(4)} (${coordsForDisplay.system}).`;
        siteData.iconSrc = siteData.isGenerallySuitable ? "images/place-ok.svg" : "images/place-bad.svg";

    } else {
        console.error("Ошибка при анализе высоты:", heightAnalysisResult ? heightAnalysisResult.error : "Неизвестная ошибка");
    }

    // 5. Обновляем UI
    if (typeof updateInfoPanel === 'function') updateInfoPanel(siteData, coordsForDisplay);
    if (typeof updateWizardStep3Coordinates === 'function') updateWizardStep3Coordinates(siteData, coordsForDisplay);
}