var http = require("http");

var dotenv = require("dotenv");
dotenv.config();

var soap = require("soap");

var express = require("express");

var bodyParser = require("body-parser");

const axios = require("axios");

var cors = require("cors"); // Require the cors package

async function calculerTrajetAvecArretsRecharge(depart, arrivee, autonomie) {
  try {
    let trajetComplet = {
      distanceTotale: 0,
      tempsEstimeSansRecharge: 0,
      segments: [],
    };

    // Obtenir le trajet initial
    let trajet = await getRoute(depart, arrivee);
    console.log("calculerTrajetAvecArretsRecharge : ", trajet);
    let feature;
    // Vérifier si le trajet a des features et des propriétés
    if (trajet && trajet.features && trajet.features.length > 0) {
      feature = trajet.features[0];
      if (feature.properties && feature.properties.summary) {
        trajetComplet.distanceTotale = feature.properties.summary.distance;
        trajetComplet.tempsEstimeSansRecharge =
          feature.properties.summary.duration;
      } else {
        throw new Error(
          "Résumé du trajet manquant dans les propriétés de la feature"
        );
      }
    } else {
      throw new Error("Données de trajet invalides ou manquantes");
    }

    // Supposons que les waypoints sont disponibles dans feature.geometry.coordinates
    let waypoints = feature.geometry.coordinates;
    let distanceParcourue = 0;
    let autonomieRestante = autonomie;

    for (let i = 0; i < waypoints.length - 1; i++) {
      let currentWaypoint = waypoints[i];
      let nextWaypoint = waypoints[i + 1];
      let segmentDistance = calculerDistanceEntrePoints(
        currentWaypoint,
        nextWaypoint
      );
      distanceParcourue += segmentDistance;

      if (distanceParcourue >= autonomieRestante) {
        let bornesPotentielles = await requestBorne(
          currentWaypoint,
          autonomieRestante
        );
        if (!bornesPotentielles || bornesPotentielles.total_count === 0) {
          throw new Error(
            "Aucune borne trouvée à proximité de l'étape actuelle"
          );
        }
        let borneChoisie = bornesPotentielles.results[0]; // Prendre la première borne pour cet exemple

        trajetComplet.segments.push({
          depart: currentWaypoint,
          arrivee: [borneChoisie.xlongitude, borneChoisie.ylatitude],
          distance: distanceParcourue,
          tempsEstime: calculerTempsSegment(distanceParcourue),
          borneRecharge: borneChoisie,
        });

        distanceParcourue = 0; // Réinitialiser la distance parcourue après la recharge
        autonomieRestante = autonomie; // Réinitialiser l'autonomie après la recharge
      }
    }

    console.log("trajetComplet : ", trajetComplet);

    return trajetComplet;
  } catch (error) {
    console.error("Erreur lors du calcul du trajet:", error.message);
    return null;
  }
}

function calculerDistanceEntrePoints(point1, point2) {
  const rayonTerre = 6371; // Rayon de la Terre en kilomètres

  const lat1 = point1[1];
  const lon1 = point1[0];
  const lat2 = point2[1];
  const lon2 = point2[0];

  const radLat1 = lat1 * (Math.PI / 180); // Convertir en radians
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

  const distance = rayonTerre * c; // Distance en kilomètres

  return distance;
}

function calculerTempsSegment(distance) {
  const vitesseMoyenne = 130; // Vitesse moyenne en km/h
  return (distance / vitesseMoyenne) * 60; // Retourner le temps en minutes
}

// Exemple d'utilisation de la fonction
async function calculerTempsTrajet(args) {
  let autonomie = args.autonomie;
  let start = JSON.parse(args.start);
  let end = JSON.parse(args.end);

  let resultat = await calculerTrajetAvecArretsRecharge(start, end, autonomie);

  return {
    distanceTotale: resultat.distanceTotale,
    tempsEstime: resultat.tempsEstimeSansRecharge,
    segments: resultat.segments,
  };
}

let requestParams = (x, y) => {
  return `?where=distance(geo_point_borne, geom'POINT(${x.join(
    " "
  )})', ${y}km)`;
};

let requestBorne = async (coords, autonomie) => {
  // fetch get  with requestParams(x,y) and return response with axios

  const baseUrl =
    "http://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/bornes-irve/records";
  console.log(coords);
  const queryParams = requestParams(coords, autonomie);
  console.log(queryParams);
  const url = `${baseUrl}${queryParams}`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

/*requestBorne(-1.520945392076356, 43.52670810565958)
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));*/

async function getRoute(start, end) {
  const apiKey = process.env.OPEN_ROUTE_SERVICE_KEY; // Remplacez par votre clé API OpenRouteService
  const url = "https://api.openrouteservice.org/v2/directions/driving-car";

  try {
    const response = await axios({
      method: "get",
      url: url,
      params: {
        api_key: apiKey,
        start: start.join(","), // Format : 'longitude,latitude'
        end: end.join(","), // Format : 'longitude,latitude'
      },
    });

    console.log("Itinéraire :", response.data);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'itinéraire :", error);
  }
}

// Exemple d'utilisation :
// Remplacez ces coordonnées par les points de départ et d'arrivée souhaités
const startCoords = [8.681495, 49.41461];
const endCoords = [8.687872, 49.420318];

//getRoute(startCoords, endCoords);

var myService = {
  ServiceTempsTrajet: {
    TempsTrajetPort: {
      calculerTempsTrajet,
    },
  },
};

var xml = require("fs").readFileSync("service.wsdl", "utf8");

//http server example
var server = http.createServer(function (request, response) {
  response.end("404: Not Found: " + request.url);
});

server.listen(8001);
soap.listen(server, "/wsdl", myService, xml, function () {
  console.log("server initialized");
});

//express server example
var app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
//body parser middleware are supported (optional)
app.use(
  bodyParser.raw({
    type: function () {
      return true;
    },
    limit: "5mb",
  })
);
app.listen(8000, function () {
  //Note: /wsdl route will be handled by soap module
  //and all other routes & middleware will continue to work
  soap.listen(app, "/wsdl", myService, xml, function () {
    console.log("server initialized");
  });
});
