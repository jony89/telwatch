const request = require('request'),
    fs = require('fs'),
    zlib = require('zlib');

const report = {
    time: undefined,
    totalCarsCapacity: undefined,
    totalCurrentlyParking: undefined,
    totalAutotelParkingSpaces: undefined,
    totalCurrentlyBlueWhiteParking: undefined,
    totalCurrentlyInUse: undefined,
    totalCars: 260,
};

const headers = {
    'Connection': 'keep-alive',
    'Host': 'reserve.autotel.co.il',
    'Cache-Control': 'no-cache',
    'Content-Length': '357',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Origin': 'https://www.autotel.co.il',
    'Taasuka-Context': 'Portal',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
    'Taasuka-UserToken': ' ',
    'Accept': '*/*',
    'Referer': 'https://www.autotel.co.il/',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.8,he;q=0.6,und;q=0.4,pl;q=0.2',
};

function mapCarData(car) {
    return {
        latitude: car.info.latitude,
        longitude: car.info.longitude,
        capacity: car.info.capacity,
        activeCarHere: car.info.activeCarHere,
        inactive: car.info.inactive,
        parkingAddress: car.info.parkingAddress && car.info.parkingAddress[0].text,
        availableCars: car.info.carsList && car.info.carsList.length,
        carsList: car.info.carsList,
    }
}

function getTotalCarsCapacity(carsData)  {
    let total = 0;
    carsData.forEach(carData => {
        total += carData.info.capacity;
    });
    return total;
}``

function getTotalBlueWhiteParkingCars(carsData)  {
    let total = 0;
    carsData.forEach(carData => {
        if (carData.info.typeId === null) total += 1;
    });
    return total;
}

function getTotalAutotelParkingSpaces(carsData)  {
    let total = 0;

    carsData.forEach(carData => {
        if (carData.info.typeId === null) return;
        total += Object.keys(carData.items).length;
    });

    return total;
}

function getCurrentFullDate() {
    var now = new Date();
    return [
        now.getDate(),
        '-',
        now.getMonth() + 1,
        '-',
        now.getFullYear(),
        ' ',
        now.getHours(),
        ':',
        ("0" + now.getSeconds()).slice(-2),
        ':',
        ("0" + now.getSeconds()).slice(-2)
    ].join('');
}

function fetchAutotel() {
    let buffer = [];
    // form: {
    //     'Profile[loss_damage_waiver]': 0,
    //     'ReservationHelper[startDate]': '',
    //     'ReservationHelper[endDate]': '',
    //     'ReservationHelper[address]': 'תל אביב-יפו',
    //     'ReservationHelper[flex_time]': '',
    //     'ReservationHelper[latitude]': '32.085109',
    //     'ReservationHelper[longitude]': '34.78170299999999',
    //     'ReservationHelper[member_credentials]': '',
    // }
    request.post({
        headers: headers,
        url: 'https://reserve.autotel.co.il/reservation/cars/ajax',
        timeout: 1000 * 60
    }).pipe(zlib.createGunzip()).on('data', (chunk) => {
        buffer.push(chunk);
    }).on('end', () => {
        const response = JSON.parse(Buffer.concat(buffer).toString());
        const date = Date.now();

        report.totalCarsCapacity = getTotalCarsCapacity(response.cars);
        report.totalCurrentlyBlueWhiteParking = getTotalBlueWhiteParkingCars(response.cars);
        report.totalAutotelParkingSpaces = getTotalAutotelParkingSpaces(response.cars);
        report.totalCurrentlyParking = report.totalAutotelParkingSpaces + report.totalCurrentlyBlueWhiteParking;
        report.totalCurrentlyInUse = report.totalCars - report.totalCurrentlyParking;
        report.time = getCurrentFullDate();

        const cars = response.cars.map(mapCarData);

        fs.writeFileSync(`./full-responses/full-response-${date}.json`, JSON.stringify(response, 0, 2) + '\n');
        fs.writeFileSync(`./mapped-responses/autotel-${date}.json`, JSON.stringify(cars, 0, 2) + '\n');
        fs.writeFileSync(`./reports/autotel-report-${date}.json`, JSON.stringify(report, 0, 2) + '\n');
    });
}

fetchAutotel();