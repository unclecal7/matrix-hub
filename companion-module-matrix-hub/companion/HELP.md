# Matrix Hub

Control video routing through Matrix Hub. Supports Blackmagic Videohub, ATEM, and other matrix routers.

## Configuration

- **Host**: IP address of the Matrix Hub server (default: 127.0.0.1)
- **Port**: HTTP port of the Matrix Hub server (default: 8080)

## Actions

- **Route Source to Destination**: Route a specific source to a destination on any connected device
- **Recall Preset**: Recall a saved routing preset on a device

## Feedbacks

- **Route Active**: Highlights when a destination is routed to a specific source
- **Device Connected**: Highlights when a device is online

## Variables

Per device: name, status, input/output counts, and per-output labels and current source.
