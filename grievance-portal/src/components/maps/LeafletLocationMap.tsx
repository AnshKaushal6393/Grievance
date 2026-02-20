import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type LatLng = { lat: number; lng: number };

type LeafletLocationMapProps = {
  position: LatLng;
  onChange?: (next: LatLng) => void;
  zoom?: number;
  className?: string;
  draggable?: boolean;
  clickToSet?: boolean;
};

const defaultLeafletIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

const RecenterMap = ({ position }: { position: LatLng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
  }, [map, position.lat, position.lng]);
  return null;
};

const MapClickHandler = ({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange?: (next: LatLng) => void;
}) => {
  useMapEvents({
    click: (event) => {
      if (!enabled || !onChange) return;
      onChange({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });
  return null;
};

const LeafletLocationMap = ({
  position,
  onChange,
  zoom = 17,
  className = "h-56 w-full rounded-lg border",
  draggable = false,
  clickToSet = false,
}: LeafletLocationMapProps) => {
  return (
    <MapContainer center={[position.lat, position.lng]} zoom={zoom} className={className}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap position={position} />
      <MapClickHandler enabled={clickToSet} onChange={onChange} />
      <Marker
        position={[position.lat, position.lng]}
        draggable={draggable}
        icon={defaultLeafletIcon}
        eventHandlers={{
          dragend: (event) => {
            if (!draggable || !onChange) return;
            const marker = event.target;
            const next = marker.getLatLng();
            onChange({
              lat: Number(next.lat.toFixed(6)),
              lng: Number(next.lng.toFixed(6)),
            });
          },
        }}
      />
    </MapContainer>
  );
};

export default LeafletLocationMap;
