import telnetlib, re

host = '192.168.1.200'
port = 9990
timeout_seconds = 5
tn = telnetlib.Telnet(host, port, timeout_seconds)

prelude = tn.read_until(b"END PRELUDE:\n\n")
routing_regex = re.compile("VIDEO OUTPUT ROUTING:\n(.*?)\n\n", re.MULTILINE | re.DOTALL)
match = routing_regex.search(prelude.decode('utf-8'))
if not match:
	raise ValueError('PRELUDE did not contain VIDEO OUTPUT ROUTING')

# Listen for updates and print message when output 0 changes.
# If running on Raspberry Pi you can use GPIO to turn an LED on and off.
while True:
	status = tn.read_until(b"\n\n")
	match = routing_regex.search(status.decode('utf-8'))
	if match:
		for pair in match.group(1).split('\n'):
			(dst, src) = pair.split()
			if dst == '0':
				if src == '3':
					print ('Turn on Tally')		# GPIO.output(5, GPIO.HIGH)
				else:
					print ('Turn off Tally')	# GPIO.output(5, GPIO.LOW)
