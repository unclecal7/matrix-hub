import telnetlib, time

host = '192.168.1.200'
port = 9990
timeout_seconds = 5
tn = telnetlib.Telnet(host, port, timeout_seconds)
tn.read_until(b"END PRELUDE:")

# Cycle through inputs 0 .. 6, changing output 0 once a second
while True:
	for input in range(0, 7):
		tn.write(('video output routing:\n0 %s\n\n' % input).encode('ascii'))
		tn.read_until(b"ACK", timeout_seconds)
		time.sleep(1)
