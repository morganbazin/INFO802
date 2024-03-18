import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
} from "@react-google-maps/api";
import React, { useEffect, useState } from "react";

interface IMapProps {
  coords: {
    latitude: number;
    longitude: number;
  };
  display_name: string;
  bornes: any[];
  depart: any;
  arrivee: any;
}

const containerStyle = {
  width: "400px",
  height: "400px",
  backgroundColor: "#121212", /* Fond sombre pour le conteneur */
};

const center = {
  lat: 48.864716,
  lng: 2.349014,
};

export default function Map(props: IMapProps) {
  const { bornes } = props;
  const { depart, arrivee } = props;

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY || "",
  });

  const [key, setKey] = useState(0);

  const mapRef = React.useRef(null);

  useEffect(() => {
    let markers = [];
    if (depart) {
      markers.push({
        id: "start",
        position: {
          lat: parseFloat(parseFloat(depart.latitude).toFixed(7)),
          lng: parseFloat(parseFloat(depart.longitude).toFixed(7)),
        },
      });
    }

    for (let i = 0; i < bornes.length; i++) {
      markers.push({
        id: bornes[i].name,
        position: {
          lat: parseFloat(bornes[i].latitude),
          lng: parseFloat(bornes[i].longitude),
        },
      });
    }

    if (arrivee) {
      markers.push({
        id: "arrivee",
        position: {
          lat: parseFloat(parseFloat(arrivee.latitude).toFixed(7)),
          lng: parseFloat(parseFloat(arrivee.longitude).toFixed(7)),
        },
      });
    }

    setMarkers(markers);
    calculateRoute();
  }, [bornes, depart, arrivee]);

  const [markers, setMarkers] = useState([
    { id: "marker1", position: { lat: -34.397, lng: 150.644 } },
    // Add more markers as needed
  ]);

  let markersComponent = markers.map((marker) => {
    return <Marker key={marker.id} position={marker.position} />;
  });
  const [directions, setDirections] = useState();
  const calculateRoute = () => {
    if (window.google && markers.length >= 2) {
      // Ensure there are at least two markers to calculate a route
      const directionsService = new window.google.maps.DirectionsService();

      const origin = markers[0].position; // Assuming the first marker is the start
      const destination = markers[markers.length - 1].position; // Assuming the last marker is the end

      const waypoints = markers.slice(1, -1).map((marker) => ({
        location: marker.position,
        stopover: true,
      }));

      directionsService.route(
        {
          origin: origin,
          destination: destination,
          waypoints: waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING, // You can choose other modes like WALKING, BICYCLING, TRANSIT
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result as any);
          } else {
            console.error(`error fetching directions ${result}`);
          }
          setKey(key + 1);
          setTimeout(() => {
            setKey(key + 2);
            console.log(mapRef.current);
          }, 1000);
        }
      );
    }
  };

  return isLoaded ? (
    <GoogleMap
      ref={mapRef}
      mapContainerStyle={containerStyle}
      center={center}
      zoom={5}
    >
      {directions && <DirectionsRenderer directions={directions} />}
      {markersComponent}
      {/* Child components, such as markers, info windows, etc. */}
      <></>
    </GoogleMap>
  ) : (
    <></>
  );
}
