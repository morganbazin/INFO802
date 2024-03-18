import { useState } from 'react';
import PlacesAutocomplete, {
    geocodeByAddress,
    getLatLng,
} from 'react-places-autocomplete';

interface LocationSearchInputProps {
    setAddress: (address: any) => void;
}

export const LocationSearchInput = (props: LocationSearchInputProps) => {
    const [address, setAddressState] = useState('');

    const handleChange = (address: string) => {
        setAddressState(address);
    };

    const handleSelect = (address: string) => {
        console.log(address);
        setAddressState(address);
        geocodeByAddress(address)
            .then(results => getLatLng(results[0]))
            .then(latLng => props.setAddress(latLng))
            .catch(error => console.error('Error', error));
    };

    return (
        <PlacesAutocomplete
            value={address}
            onChange={handleChange}
            onSelect={handleSelect}
        >
            {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
                <div>
                    <input
                        {...getInputProps({
                            placeholder: 'Recherchez des lieux...',
                            className: 'form-control location-search-input',
                        })}
                    />
                    <div className="autocomplete-dropdown-container">
                        {loading && <div>Chargement...</div>}
                        {suggestions.map(suggestion => {
                            const className = suggestion.active
                                ? 'list-group-item list-group-item-action active'
                                : 'list-group-item list-group-item-action';
                            return (
                                <div
                                    {...getSuggestionItemProps(suggestion, {
                                        className,
                                    })}
                                >
                                    <span>{suggestion.description}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </PlacesAutocomplete>
    );
};
