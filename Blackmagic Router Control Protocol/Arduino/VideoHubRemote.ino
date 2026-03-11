#include <SPI.h>
#include <Ethernet.h>

byte arduinoMac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };
IPAddress arduinoIp(192, 168, 1, 100);
IPAddress videohubIp(192, 168, 1, 200);

const int switch1 = 14;  // A0 on PCB, SWITCH 1 (closest to USB)
const int switch2 = 15;  // A1 on PCB, SWITCH 2
const int switch3 = 16;  // A2 on PCB, SWITCH 3 (closest to edge)
const int led1 = 6;
const int led2 = 5;
const int led3 = 3;

EthernetClient client;

int lastButtonPress = -1;


void setup() {
  // This circuit requires 3 buttons, 3 LEDs and an Ethernet shield
  // Analog 0, 1, 2 are digital pins 14, 15, 16 and must be setup as INPUT_PULLUP
  // since they are connected through a switch to ground
  pinMode(switch1, INPUT_PULLUP);  // A0 on PCB, SWITCH 1 (closest to USB)
  pinMode(switch2, INPUT_PULLUP);  // A1 on PCB, SWITCH 2
  pinMode(switch3, INPUT_PULLUP);  // A2 on PCB, SWITCH 3 (closest to edge)

  pinMode(led1, OUTPUT);     // D6 PWM
  pinMode(led2, OUTPUT);     // D5 PWM
  pinMode(led3, OUTPUT);     // D3 PWM

  setLed(0);

  // Open serial communications and wait for port to open:
  Serial.begin(9600);
  while (! Serial) {
    ; // wait for serial port to connect. Needed for native USB port only
  }

  // start the Ethernet connection:
  Ethernet.begin(arduinoMac, arduinoIp);

  // give the Ethernet shield a second to initialize:
  delay(1000);
}

void loop() {
  if (! client.connected()) {
    Serial.println("disconnected.");
    client.stop();

    setLed(0);
    delay(2500);

    Serial.println("connecting...");

    if (client.connect(videohubIp, 9990)) {
      Serial.println("connected");
    }
    else {
      // if you didn't get a connection to the server:
      Serial.println("connection failed");
    }
  }
  else {
    int buttonPress = getButton();
    if (buttonPress > 0 && buttonPress != lastButtonPress) {
      lastButtonPress = buttonPress;

      setLed(buttonPress);

      if (buttonPress == 1)
        client.print("VIDEO OUTPUT ROUTING:\n0 0\n\n");
      else if (buttonPress == 2)
        client.print("VIDEO OUTPUT ROUTING:\n0 1\n\n");
      else if (buttonPress == 3)
        client.print("VIDEO OUTPUT ROUTING:\n0 2\n\n");
    }
  }
}

int getButton() {
  if (digitalRead(switch1) == LOW)
    return 1;
  else if (digitalRead(switch2) == LOW)
    return 2;
  else if (digitalRead(switch3) == LOW)
    return 3;

  return 0;
}

void setLed(int button) {
  digitalWrite(led1, button == 1);
  digitalWrite(led2, button == 2);
  digitalWrite(led3, button == 3);

  TCCR1B = (1 << OCF1A);
  OCR1A = 1000;
  TCCR1B |= (1 << CS10) | (1 << CS11);
  sei();
}

ISR(TIMER1_COMPA_vect) {
  static bool flash = false;
  flash = ! flash;
  digitalWrite(led1, flash);
}

