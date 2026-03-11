import telnetlib

host = '192.168.1.200'
port = 9990
timeout_seconds = 5
tn = telnetlib.Telnet(host, port, timeout_seconds)

tn.read_until(b"END PRELUDE:")
tn.write(('''video output routing:
0 1
1 2
2 2
3 5
4 0
5 5
6 6

''').encode('ascii'))
tn.read_until(b"ACK", timeout_seconds)
