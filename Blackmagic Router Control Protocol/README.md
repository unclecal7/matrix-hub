# Videohub Router Control Protocol

## Samples

This package consists of the 4 code samples from the Videohub Router Control Protocol presentation to control a [Blackmagic Design Videohub](<https://www.blackmagicdesign.com/products/smartvideohub>) mixed format router.

1. presets.py (Python script)
2. cctv.py (Python script)
3. tally.py (Python script)
4. VideoHubRemote.ino (Arduino sketch)

## Prerequisites

### Python

Python 2.7, Python 3.6 or newer is required to run python scripts. On Debian systems, this can usually be installed via:

```
sudo apt install python3 python3-pip
```

### Arduino

To run VideoHubRemote Arduino sketch, download and install Arduino IDE from <https://www.arduino.cc>.  The sample is based on the following hardware:

* Arduino board
* Ethernet shield
* 3 buttons
* 3 LEDs (capable of being driven by your Arduino's digital pins)

### Videohub Software

* Download Blackmagic Videohub 6.4.1 update from <https://www.blackmagicdesign.com/support/family/routing-and-distribution>.  Follow steps to install software.
* All samples have been verified against 6.4.1.

### Videohub Hardware

* Blackmagic Videohub router e.g. Smart Videohub 12x12, Universal Videohub 72

## Setup

1) Connect a Blackmagic Design Videohub to your computer/Arduino, via an Ethernet cable, either directly or via Ethernet router/switch
2) Configure the Videohub network settings as specified in section *Connecting Videohub to a Network* in the **Videohub Operation Manual**

## Running Samples

### Python Samples

1) Edit python script to ensure host variable matches IP address of Videohub

```python
host = '192.168.1.200'
```

2) Run python script from command line, eg

```
python presets.py
```

### Arduino Samples

1) In Arduino IDE, edit sketch to ensure videohubIp variable matches IP address of Videohub, and that arduinoIp has an IP address on the same subnet as the Videohub

```sketch
IPAddress arduinoIp(192, 168, 1, 100);
IPAddress videohubIp(192, 168, 1, 200);
```

2) Edit sketch to ensure LEDs and buttons specify the correct pins for calling pinMode()

```sketch
const int switch1 = 14;
const int switch2 = 15;
const int switch3 = 16;
const int led1 = 6;
const int led2 = 5;
const int led3 = 3;
```

3) Upload sketch to your board
