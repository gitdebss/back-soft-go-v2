CREATE TABLE transport_ride_type (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE ride (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date DATE NOT NULL,
    hour TIME NOT NULL,
    city VARCHAR(100) NOT NULL,
    complement VARCHAR(200),
    name VARCHAR(100) NOT NULL,
    transport_type_id INT NOT NULL,
    total_spots INT NOT NULL,
    obs VARCHAR(200),
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP,
    CONSTRAINT fk_ride_transport_type FOREIGN KEY (transport_type_id) REFERENCES transport_ride_type (id)
);

CREATE TABLE ride_user (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_ride INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    CONSTRAINT fk_ride_user_ride FOREIGN KEY (id_ride) REFERENCES ride (id) ON DELETE CASCADE
);