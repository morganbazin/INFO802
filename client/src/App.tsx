import Map from "./Map";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
} from "@apollo/client";
import { useState } from "react";
import { LocationSearchInput } from "./components/LocationSearchInput";
import { VehiclesComponent } from "./components/VehiclesComponent";

import { parseString } from "xml2js";

function App() {
  const [autonomie, setAutonomie] = useState(0);
  const [addressStart, setAddressStart] = useState({ lat: 0, lng: 0 });
  const [addressEnd, setAddressEnd] = useState({ lat: 0, lng: 0 });

  const [distance, setDistance] = useState(0);
  const [tempsEstime, setTempsEstime] = useState(0);

  const [bornes, setBornes] = useState([] as any[]);
  const [depart, setDepart] = useState({ latitude: 0, longitude: 0 });
  const [arrivee, setArrivee] = useState({ latitude: 0, longitude: 0 });

  // Configuration d'Apollo Client
  const client = new ApolloClient({
    uri: "https://api.chargetrip.io/graphql",
    cache: new InMemoryCache(),
    headers: {
      "x-client-id": import.meta.env.VITE_CHARGETRIP_CLIENT_ID,
      "x-app-id": import.meta.env.VITE_CHARGETRIP_APP_ID,
    },
  });

  let soapRequestXML = `
  <?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://www.exemple.com/temps_trajet">
    <soap:Body>
        <tns:CalculTempsTrajetRequest>
            <tns:start>[${addressStart.lng}, ${addressStart.lat}]</tns:start>
            <tns:end>[${addressEnd.lng}, ${addressEnd.lat}]</tns:end>
            <tns:autonomie>${autonomie}</tns:autonomie>
        </tns:CalculTempsTrajetRequest>
    </soap:Body>
  </soap:Envelope>
  `;

  function formatTime(seconds: any) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    let timeString = "";

    if (hours > 0) {
      timeString += `${hours}h `;
    }

    if (minutes > 0 || hours === 0) {
      timeString += `${minutes} min`;
    }

    return timeString.trim();
  }

  const callSoapService = async () => {
    const url = "https://apimorgan.makeprops.fr/wsdl";
    const headers = {
      "Content-Type": "text/xml;charset=UTF-8",
      SOAPAction: "http://www.exemple.com/temps_trajet/calculerTempsTrajet",
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: soapRequestXML,
      });

      const text = await response.text(); // or .xml() if supported

      parseString(text, (err: any, result: any) => {
        if (err) {
          console.error("Error parsing XML:", err);
          return;
        }

        let object =
          result["soap:Envelope"]["soap:Body"][0][
          "tns:CalculTempsTrajetResponse"
          ][0];

        let distance = object["distanceTotale"][0];
        let tempsEstime = object["tempsEstime"][0];

        setDistance(distance / 1000);
        setTempsEstime(tempsEstime);

        let segments = object["segments"];

        setDepart({ latitude: addressStart.lat, longitude: addressStart.lng });
        setArrivee({ latitude: addressEnd.lat, longitude: addressEnd.lng });

        let bornes = segments[0]["borneRecharge"];

        let bornesArray = bornes.map((borne: any) => {
          return {
            latitude: parseFloat(borne["geo_point_borne"][0]["lat"][0]),
            longitude: parseFloat(borne["geo_point_borne"][0]["lon"][0]),
            name: borne["n_station"][0],
          };
        });

        console.log("bornesArray : ", bornesArray);

        setBornes(bornesArray);
      });
    } catch (error) {
      console.error("SOAP Request Error:", error);
    }
  };

  return (
    <div className="bg-light pt-5">
      <div className="d-flex justify-content-center gap-2">
        <ApolloProvider client={client}>
          <VehiclesComponent setAutonomie={setAutonomie} />
        </ApolloProvider>

        <div className="d-flex flex-column gap-3">
          <div className="w-100">
            <label htmlFor="autonomyInput" className="form-label">Autonomie</label>
            <input
              type="number"
              className="form-control"
              id="autonomyInput"
              placeholder="Autonomie"
              value={autonomie}
              onChange={(e) => setAutonomie(parseInt(e.target.value))}
            />
            <div className="d-flex flex-row gap-2 justify-content-between p-2">
              <div className="d-flex flex-column gap-1">
                <p>Départ</p>
                <LocationSearchInput setAddress={setAddressStart} />
              </div>
              <div className="d-flex flex-column gap-1">
                <p>Arrivée</p>
                <LocationSearchInput setAddress={setAddressEnd} />
              </div>
            </div>
            <button
              className="btn btn-info"
              onClick={() => {
                callSoapService();
                setTimeout(() => {
                  callSoapService();
                  setTimeout(() => {
                    callSoapService();
                  }, 250);
                }, 250);
              }}
            >
              Rechercher l'itinéraire
            </button>

            <div className="card mt-3">
              <div className="card-body">
                <p>Distance: {distance.toFixed(2)} km</p>
                <p>Temps estimé: {formatTime(tempsEstime)}</p>
              </div>
            </div>
          </div>
          <Map
            display_name="test"
            coords={{ longitude: 40, latitude: 2 }}
            bornes={bornes}
            depart={depart}
            arrivee={arrivee}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
