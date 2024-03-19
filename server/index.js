var http = require("http");

var dotenv = require("dotenv");
dotenv.config();

var soap = require("soap");

var express = require("express");

var bodyParser = require("body-parser");

const axios = require("axios");

var cors = require("cors");

async function calculTravelWithStopCharging(departure, arrival, autonomy) {
  try {
    let travelComplete = {
      distanceComplete: 0,
      timeEstimateWithoutCharging: 0,
      segments: [],
    };

    let travel = await getRoute(departure, arrival);
    let feature;
    if (travel && travel.features && travel.features.length > 0) {
      feature = travel.features[0];
      if (feature.properties && feature.properties.summary) {
        travelComplete.distanceComplete = feature.properties.summary.distance;
        travelComplete.timeEstimateWithoutCharging =
          feature.properties.summary.duration;
      } else {
        throw new Error(
          "Résumé du trajet manquant dans les propriétés de la feature"
        );
      }
    } else {
      throw new Error("Données de trajet invalides ou manquantes");
    }

    let waypoints = feature.geometry.coordinates;
    let distanceDone = 0;
    let autonomyRemaining = autonomy;

    for (let i = 0; i < waypoints.length - 1; i++) {
      let currentWaypoint = waypoints[i];
      let nextWaypoint = waypoints[i + 1];
      let segmentDistance = calculDistanceBetweenPoints(
        currentWaypoint,
        nextWaypoint
      );
      distanceDone += segmentDistance;

      if (distanceDone >= autonomyRemaining) {
        let potentialBornes = await requestBorne(
          currentWaypoint,
          autonomyRemaining
        );
        if (!potentialBornes || potentialBornes.total_count === 0) {
          throw new Error(
            "Aucune borne trouvée à proximité de l'étape actuelle"
          );
        }
        let borneChosen = potentialBornes.results[0];

        travelComplete.segments.push({
          depart: currentWaypoint,
          arrivee: [borneChosen.xlongitude, borneChosen.ylatitude],
          distance: distanceDone,
          tempsEstime: calculeTimeSegment(distanceDone),
          borneRecharge: borneChosen,
        });

        distanceDone = 0;
        autonomyRemaining = autonomy;
      }
    }

    return travelComplete;
  } catch (error) {
    console.error("Erreur lors du calcul du trajet:", error.message);
    return null;
  }
}

function calculDistanceBetweenPoints(point1, point2) {
  const rayonEarth = 6371;

  const lat1 = point1[1];
  const lon1 = point1[0];
  const lat2 = point2[1];
  const lon2 = point2[0];

  const radLat1 = lat1 * (Math.PI / 180);
  const radLat2 = lat2 * (Math.PI / 180);
  const deltaLat = (lat2 - lat1) * (Math.PI / 180);
  const deltaLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) *
    Math.cos(radLat2) *
    Math.sin(deltaLon / 2) *
    Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = rayonEarth * c;

  return distance;
}

function calculeTimeSegment(distance) {
  const speedMoyenne = 130;
  return (distance / speedMoyenne) * 60;
}

async function calculTimeTravel(args) {
  let autonomy = args.autonomie;
  let start = JSON.parse(args.start);
  let end = JSON.parse(args.end);

  let resultat = await calculTravelWithStopCharging(start, end, autonomy);

  return {
    distanceTotale: resultat.distanceComplete,
    tempsEstime: resultat.timeEstimateWithoutCharging,
    segments: resultat.segments,
  };
}

let requestParams = (x, y) => {
  return `?where=distance(geo_point_borne, geom'POINT(${x.join(
    " "
  )})', ${y}km)`;
};

let requestBorne = async (coords, autonomy) => {

  const baseUrl =
    "http://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/bornes-irve/records";
  const queryParams = requestParams(coords, autonomy);
  const url = `${baseUrl}${queryParams}`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

async function getRoute(start, end) {
  const apiKey = process.env.OPEN_ROUTE_SERVICE_KEY;
  const url = "https://api.openrouteservice.org/v2/directions/driving-car";

  try {
    const response = await axios({
      method: "get",
      url: url,
      params: {
        api_key: apiKey,
        start: start.join(","),
        end: end.join(","),
      },
    });

    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'itinéraire :", error);
  }
}

var myService = {
  ServiceTempsTrajet: {
    TempsTrajetPort: {
      calculerTempsTrajet: calculTimeTravel,
    },
  },
};

var xml = require("fs").readFileSync("service.wsdl", "utf8");

var server = http.createServer(function (request, response) {
  response.end("404: Not Found: " + request.url);
});

server.listen(8001);
soap.listen(server, "/wsdl", myService, xml, function () {
  console.log("server initialized");
});

var app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(
  bodyParser.raw({
    type: function () {
      return true;
    },
    limit: "5mb",
  })
);
app.listen(8000, function () {
  soap.listen(app, "/wsdl", myService, xml, function () {
    console.log("server initialized");
  });
});
