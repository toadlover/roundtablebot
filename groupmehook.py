
#!/usr/bin/env python
"""
Very simple HTTP server in python.

Usage::
	./dummy-web-server.py [<port>]

Send a GET request::
	curl http://localhost

Send a HEAD request::
	curl -I http://localhost

Send a POST request::
	curl -d "foo=bar&bin=baz" http://localhost

"""
import sys
import json
import requests
import base64

def try_parse_int(s, base=10):
	try:
		return int(s, base)
	except ValueError:
		return 0


if sys.version_info[0] < 3:
	# python 2 import
	from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
else:
	# python 3 import
	from http.server import BaseHTTPRequestHandler, HTTPServer


fh = open("config.json")
config = json.loads(fh.read());
fh.close()
webhook_url = config['discord_webhook_url']
groupme_id = try_parse_int(config['groupme_user_id'])
allow_all = True if config['allow_all'] == "true" else False
if groupme_id == 0 and not allow_all:
	print("No GroupMe ID was specified or it isn't a number. You will not be able to send messages to Discord.")
	print("If this is your first time setting up the GroupMe hook, send a message and then copy the ID to config.json, then restart this program.")
	
check_my_ip = True if config['check_my_ip'] == "true" else False

class BaseServer(BaseHTTPRequestHandler):
	def _set_headers(self):
		self.send_response(200)
		self.send_header('Content-type', 'text/html')
		self.end_headers()

	def do_GET(self):
		self._set_headers()
		self.wfile.write("<html><body><p>Go away!!</p></body></html>"
							.encode('utf-8'))

	def do_HEAD(self):
		self._set_headers()
		
	def do_POST(self):
		content_length = int(self.headers['Content-Length'])
		post_data = self.rfile.read(content_length)
		#uncomment this to print the contents of whatever is sent to this program.
		#print(post_data)
		j = json.loads(post_data.decode('utf8'))
		#If the sender type is "bot" or "system", ignore it and don't send it to Discord.
		if j['sender_type'] != "user":
			return
		if int(j['user_id']) == groupme_id or allow_all:
			if j['attachments'] and j['attachments'][0]['type'] == "image":
				url = j['attachments'][0]['url']
				r = requests.post(
							webhook_url,
							json={
								"content":j['text'],
								"username":j['name'],
								"avatar_url":j['avatar_url'],
								"embeds":[{
									"image":{
										"url":url
									}
								}]
							}
						)
			else:
				r = requests.post(webhook_url, json={"content":j['text'],"username":j['name'],"avatar_url":j['avatar_url']})
			#TODO: Only print on error
			print(r.status_code, r.reason)
			self._set_headers()
			self.wfile.write("<html><body><p>POST!</p><p>%s</p></body></html>"
								.encode('utf-8') % post_data)
		print(j['name'] + " (ID " + j['user_id'] + ") sent: " + j['text'])
		
def run(server_class=HTTPServer, handler_class=BaseServer, port=80):
	server_address = ('', port)
	httpd = server_class(server_address, handler_class)
	print('HTTP server running on port %s'% port)
	if check_my_ip:
		res = requests.get('https://api.ipify.org?format=json')
		if res.status_code == 200:
			if port != 80:
				print("Your GroupMe callback URL is http://"+json.loads(res.text)['ip']+":"+str(port))
			else:
				print("Your GroupMe callback URL is http://"+json.loads(res.text)['ip'])
		else:
			print("Failed to determine your GroupMe callback URL, find your IP address yourself.")
	httpd.serve_forever()

if __name__ == "__main__":
	from sys import argv

	if len(argv) == 2:
		run(port=int(argv[1]))
	else:
		run()
