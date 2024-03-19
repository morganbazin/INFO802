import { gql, useQuery } from "@apollo/client";
import { useState } from "react";

interface VehiclesComponentProps {
  setAutonomie: (autonomie: number) => void;
}

export function VehiclesComponent(props: VehiclesComponentProps) {
  const [search, setSearch] = useState("Peugeot");

  // Requête GraphQL pour obtenir la liste des véhicules
  const GET_VEHICLES = gql`
    query vehicleList($page: Int, $size: Int, $search: String) {
      vehicleList(page: $page, size: $size, search: $search) {
        id
        naming {
          make
          model
          chargetrip_version
        }
        media {
          image {
            thumbnail_url
          }
        }
        range {
          chargetrip_range {
            best
            worst
          }
        }
      }
    }
  `;

  let content = [] as any;

  const { loading, error, data } = useQuery(GET_VEHICLES, {
    variables: { page: 0, size: 10, search: search },
  });

  if (loading) return <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>;
  if (error) return <p>Error :</p>;

  data.vehicleList.map((vehicle: any) =>
    content.push(
      <div className="d-flex flex-row align-items-center" key={vehicle.id}>
        <div>
          <p>
            {`${vehicle.naming.make}-${vehicle.naming.model} ${vehicle.naming.chargetrip_version}`}
          </p>
          <p>{"Autonomie : " + vehicle.range.chargetrip_range.best + " km"}</p>
          <button
            className="btn btn-info btn-sm rounded-pill"
            onClick={() => {
              props.setAutonomie(vehicle.range.chargetrip_range.best);
            }}
          >
            Choisir
          </button>
        </div>
        <img src={vehicle.media.image.thumbnail_url} alt="Vehicle thumbnail"></img>
      </div>
    )
  );

  return (
    <div className="card shadow p-3">
      <h2>Liste de véhicule</h2>
      <input
        className="form-control"
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Recherche"
      />
      <div className="mt-3">{content}</div>
    </div>
  );
}
