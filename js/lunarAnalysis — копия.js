// js/lunarAnalysis.js

/**
 * Карта цветов для DEM LROC WAC Digital Terrain Models.
 * Массив объектов { color: [r,g,b], height: meters }
 * ЗАПОЛНИ ЭТУ КАРТУ ТОЧНЫМИ RGB ЗНАЧЕНИЯМИ С ТВОИХ ТАЙЛОВ ДЛЯ КАЖДОЙ ОПОРНОЙ ВЫСОТЫ!
 * Я оставляю твои предыдущие значения, но красный/белый для высоких точек нужно добавить или уточнить.
 */
const lunarDemColorMap = [
    { color: [170, 87, 220], height: -9150 },   // Фиолетовый
    { color: [56, 95, 230], height: -4170 },    // Голубой
    { color: [65, 213, 216], height: -2180 },   // Светло-голубой
    { color: [62, 214, 151], height: 0 },       // Зеленый (принят за 0м)
    { color: [65, 189, 86], height: 210 },      // Светло-зеленый
    { color: [218, 234, 36], height: 810 },     // Желтый
    { color: [243, 113, 37], height: 5780 }     // Оранжевый
    // Пример: { color: [255, 0, 0], height: 10760 } // Если красный соответствует этой высоте
    // Пример: { color: [250, 250, 250], height: 11000 } // Если почти белый соответствует еще большей высоте
].sort((a, b) => a.height - b.height); // Гарантируем сортировку по высоте

/**
 * Вычисляет "расстояние" между двумя цветами в RGB пространстве (сумма квадратов разниц).
 */
function colorDistanceSq(c1, c2) {
    if (!c1 || !c2) return Infinity; // Защита от undefined
    return Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2) + Math.pow(c1[2] - c2[2], 2);
}

/**
 * Преобразует RGB цвет пикселя в высоту, используя линейную интерполяцию
 * между двумя ближайшими по цветовому расстоянию опорными цветами из colorMap.
 */
function getColorToHeight(r, g, b, colorMap) {
    if (!colorMap || colorMap.length === 0) {
        console.warn("getColorToHeight: Карта цветов пуста.");
        return null;
    }
    if (colorMap.length === 1) return colorMap[0].height;

    const targetColor = [r, g, b];
    
    let closest1 = null;
    let closest2 = null;
    let minDist1Sq = Infinity;
    let minDist2Sq = Infinity;

    for (const entry of colorMap) {
        const distSq = colorDistanceSq(targetColor, entry.color);
        if (distSq < minDist1Sq) {
            minDist2Sq = minDist1Sq;
            closest2 = closest1;
            minDist1Sq = distSq;
            closest1 = entry;
        } else if (distSq < minDist2Sq) {
            minDist2Sq = distSq;
            closest2 = entry;
        }
    }

    if (!closest1) return null; 
    if (minDist1Sq === 0) return closest1.height; // Точное совпадение

    if (!closest2) return closest1.height; // Если только один уникальный ближайший

    // Упорядочим p1 и p2 по высоте для предсказуемой интерполяции
    let p1_interp, p2_interp;
    if (closest1.height < closest2.height) {
        p1_interp = closest1; p2_interp = closest2;
    } else {
        p1_interp = closest2; p2_interp = closest1;
    }

    if (p1_interp.height === p2_interp.height) {
        return p1_interp.height; // Если ближайшие два имеют одинаковую высоту
    }

    // Взвешенная интерполяция по обратному цветовому расстоянию
    const d1Sq = colorDistanceSq(targetColor, p1_interp.color); // Расстояние до p1 (нижняя высота)
    const d2Sq = colorDistanceSq(targetColor, p2_interp.color); // Расстояние до p2 (верхняя высота)

    if (d1Sq === 0) return p1_interp.height;
    if (d2Sq === 0) return p2_interp.height;

    const w1 = 1 / Math.sqrt(d1Sq); // Вес для p1_interp
    const w2 = 1 / Math.sqrt(d2Sq); // Вес для p2_interp
    
    if (!isFinite(w1) && !isFinite(w2)) { // Оба расстояния 0 (не должно быть из-за проверок выше)
         return p1_interp.height;
    }
    if (!isFinite(w1)) return p2_interp.height; // Бесконечно близко к p2
    if (!isFinite(w2)) return p1_interp.height; // Бесконечно близко к p1


    const interpolatedHeight = (p1_interp.height * w2 + p2_interp.height * w1) / (w1 + w2);
    // Изменена логика весов: чем ближе к p1 (d1Sq мало, w1 велико), тем больше вес p1.height (ошибка была в прошлом)
    // Правильно: высота_p1 * (вес_p1) + высота_p2 * (вес_p2)
    // Вес_p1 должен быть пропорционален близости к p1, т.е. обратно пропорционален d1.
    // t = d2 / (d1+d2) ; H = H1*(1-t) + H2*t = (H1*d1 + H2*d2)/(d1+d2) - это если d1 и d2 сами расстояния, а не их корни
    // Если используем корни: t = d2_sqrt / (d1_sqrt + d2_sqrt); H = H1*(1-t) + H2*t
    // H = (H1*d1_sqrt + H2*d2_sqrt) / (d1_sqrt + d2_sqrt) -- это не то
    // Вернемся к (p1.height * w1 + p2.height * w2) / (w1 + w2); где w1 = 1/d1, w2 = 1/d2
    // Это (p1.h/d1 + p2.h/d2) / (1/d1 + 1/d2) = (p1.h*d2 + p2.h*d1) / (d1 + d2) - вот эта формула правильная
    // d1, d2 - это КОРНИ из квадратов расстояний.
    const d_to_p1 = Math.sqrt(d1Sq);
    const d_to_p2 = Math.sqrt(d2Sq);
    const finalInterpolatedHeight = (p1_interp.height * d_to_p2 + p2_interp.height * d_to_p1) / (d_to_p1 + d_to_p2);


    // Ограничиваем результат диапазоном высот из colorMap
    const minH = colorMap[0].height;
    const maxH = colorMap[colorMap.length - 1].height;
    
    return Math.max(minH, Math.min(maxH, finalInterpolatedHeight));
}


/**
 * Анализирует DEM тайл для получения высоты в ОДНОЙ точке.
 */
async function getHeightAtPoint(lngLatWGS84, mapInstance, lunarProjCartographicName, wgs84ProjName, wmsBaseUrl, demLayerName, wmsSrsRequest, colorMap) {
    let lunarCoordsXY;
    if (typeof proj4 === 'undefined') {
        console.error("getHeightAtPoint: Proj4 не определен");
        return null;
    }

    try {
        lunarCoordsXY = proj4(wgs84ProjName, lunarProjCartographicName, [lngLatWGS84.lng, lngLatWGS84.lat]);
    } catch (e) {
        console.error("getHeightAtPoint: Proj4 ошибка трансформации координат клика:", e);
        return null;
    }

    const analysisBoxSizeMeters = 10; 
    const lunarBboxForAnalysis = [
        lunarCoordsXY[0] - analysisBoxSizeMeters / 2,
        lunarCoordsXY[1] - analysisBoxSizeMeters / 2,
        lunarCoordsXY[0] + analysisBoxSizeMeters / 2,
        lunarCoordsXY[1] + analysisBoxSizeMeters / 2
    ].join(',');

    const tileRequestWidth = 3; 
    const tileRequestHeight = 3;

    const tileUrlForAnalysis = `${wmsBaseUrl}&LAYERS=${demLayerName}&SRS=${encodeURIComponent(wmsSrsRequest)}&BBOX=${lunarBboxForAnalysis}&WIDTH=${tileRequestWidth}&HEIGHT=${tileRequestHeight}`;

    try {
        const response = await fetch(tileUrlForAnalysis);
        if (!response.ok) {
            console.error(`getHeightAtPoint: Ошибка ${response.status} загрузки DEM региона:`, tileUrlForAnalysis);
            return null;
        }
        const imageBlob = await response.blob();
        const imageBitmap = await createImageBitmap(imageBlob);

        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width; 
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(imageBitmap, 0, 0);

        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        const pixelData = ctx.getImageData(centerX, centerY, 1, 1).data;
        
        return getColorToHeight(pixelData[0], pixelData[1], pixelData[2], colorMap);

    } catch (error) {
        console.error("getHeightAtPoint: Ошибка анализа DEM тайла:", error);
        return null;
    }
}

/**
 * Рассчитывает уклон в точке, анализируя высоты соседних точек.
 */
async function calculateSlopeForPoint(centerLngLatWGS84, mapInstance, samplingDistanceMeters, 
                                    lunarProjCartographicName, wgs84ProjName, 
                                    wmsBaseUrl, demLayerName, wmsSrsRequest, colorMap) {
    
    const centerHeight = await getHeightAtPoint(centerLngLatWGS84, mapInstance, lunarProjCartographicName, wgs84ProjName, wmsBaseUrl, demLayerName, wmsSrsRequest, colorMap);
    if (centerHeight === null) {
        console.warn("calculateSlopeForPoint: Не удалось получить высоту для центральной точки.");
        return null;
    }

    const neighborHeights = [];
    const R_MOON_METERS = 1737400;

    const metersPerDegreeLat = (Math.PI * R_MOON_METERS) / 180;
    const metersPerDegreeLonAtLat = (Math.PI * R_MOON_METERS * Math.cos(centerLngLatWGS84.lat * Math.PI / 180)) / 180;

    if (metersPerDegreeLat === 0 || metersPerDegreeLonAtLat === 0) {
        console.warn("calculateSlopeForPoint: metersPerDegreeLat или metersPerDegreeLonAtLat равен 0, возможно на полюсе. Уклон не может быть рассчитан.");
        return 0; // Или null, если это более подходяще
    }

    const latOffsetDegrees = samplingDistanceMeters / metersPerDegreeLat;
    const lonOffsetDegrees = samplingDistanceMeters / metersPerDegreeLonAtLat;

    const neighborCoordsWGS84 = [
        { lng: centerLngLatWGS84.lng, lat: centerLngLatWGS84.lat + latOffsetDegrees }, // North
        { lng: centerLngLatWGS84.lng, lat: centerLngLatWGS84.lat - latOffsetDegrees }, // South
        { lng: centerLngLatWGS84.lng + lonOffsetDegrees, lat: centerLngLatWGS84.lat }, // East
        { lng: centerLngLatWGS84.lng - lonOffsetDegrees, lat: centerLngLatWGS84.lat }  // West
    ];

    // Используем Promise.all для параллельного запроса высот соседей
    const heightPromises = neighborCoordsWGS84.map(coord => 
        getHeightAtPoint(coord, mapInstance, lunarProjCartographicName, wgs84ProjName, wmsBaseUrl, demLayerName, wmsSrsRequest, colorMap)
    );

    const resolvedNeighborHeights = await Promise.all(heightPromises);
    
    return calculateSlopeFromHeights(centerHeight, resolvedNeighborHeights, samplingDistanceMeters);
}

/**
 * Вспомогательная функция для расчета уклона по массиву высот.
 */
function calculateSlopeFromHeights(centerHeight, neighborHeights, distanceMeters) {
    if (centerHeight === null || !neighborHeights || distanceMeters <= 0) {
        // console.warn("calculateSlopeFromHeights: неверные входные данные.");
        return null;
    }
    
    let maxSlopeRatio = 0;
    let validNeighborsCount = 0;

    for (const neighborH of neighborHeights) {
        if (neighborH !== null) {
            const deltaH = Math.abs(centerHeight - neighborH);
            const currentSlopeRatio = deltaH / distanceMeters;
            if (currentSlopeRatio > maxSlopeRatio) {
                maxSlopeRatio = currentSlopeRatio;
            }
            validNeighborsCount++;
        }
    }

    if (validNeighborsCount > 0) {
        return Math.atan(maxSlopeRatio) * (180 / Math.PI);
    }
    // console.warn("calculateSlopeFromHeights: нет валидных соседей для расчета уклона.");
    return null; 
}