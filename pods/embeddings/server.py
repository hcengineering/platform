from functools import partial
from http.server import BaseHTTPRequestHandler, HTTPServer
import json

import model as embeddings
import argparse

import traceback

def toArray(emb):
  return [v.item() for v in emb]


class EmbeddingsServer(BaseHTTPRequestHandler):
    embService: embeddings.EmbeddingService
    
    def __init__(self, embService, *args, **kwargs):
      self.embService = embService
      super().__init__(*args, **kwargs)
    
    def do_POST(self):
        try:
          if self.path == '/embeddings':
            self.sendEmbeddings()
            return
          
          if self.path == '/completion':
            self.sendCompletion()
            return
          
          if self.path == '/compare':
            self.sendCompare()
            return
        except BaseException as e:
          print('Failed to process', e)
          pass
        
        self.send_response(200)
        self.send_header("Content-type", "text/json")
        self.end_headers()
        obj = {
            "result": False,
            "error": "Unknown service"
        }
        self.wfile.write(bytes(json.dumps(obj), "utf-8"))

    def sendEmbeddings(self):           
        data = self.rfile.read(int(self.headers['Content-Length']))
        jsbody = json.loads(data)
        model = jsbody["model"]
        try:
          embeddings = self.embService.embeddings(jsbody["input"])
          emb = toArray(embeddings[0])
          obj = {
                "data": [
                  {
                    "embedding": emb,
                    "size": len(emb)
                  }
                ],
                "model": model,
                "usage": {
                  "prompt_tokens": embeddings[1],
                  "total_tokens": 1
                }            
            }
          self.send_response(200)
          self.send_header("Content-type", "text/json")
          self.end_headers()     
          self.wfile.write(bytes(json.dumps(obj), "utf-8"))
        except BaseException as e:
          # self.send_response(400, str(e))
          self.send_error(400, str(e))
          self.end_headers()
          print('error', e)
          traceback.print_exc()
          pass
        
    def sendCompletion(self):
        self.send_response(200)
        self.send_header("Content-type", "text/json")
        self.end_headers()          
        data = self.rfile.read(int(self.headers['Content-Length']))
        jsbody = json.loads(data)
        completion = self.embService.completion(jsbody["input"], max_length=jsbody["max_length"], temperature=jsbody["temperature"] )
        model = jsbody["model"]
        obj = {
              "data": [
                {
                  "completion": completion
                }
              ],
              "model": model
          }
        self.wfile.write(bytes(json.dumps(obj), "utf-8"))
        
    def sendCompare(self):
        self.send_response(200)
        self.send_header("Content-type", "text/json")
        self.end_headers()          
        data = self.rfile.read(int(self.headers['Content-Length']))
        jsbody = json.loads(data)
        emb1 = self.embService.embeddings(jsbody["input"])
        emb2 = self.embService.embeddings(jsbody["compare"])
        model = jsbody["model"]
        e1 = toArray(emb1[0])
        e2 = toArray(emb2[0])
        obj = {
              "similarity": self.embService.compare(emb1[0], emb2[0]).item(),
              "input": e1,
              "input_len": len(e1), 
              "compare": e2,
              "compare_len": len(e2),
              "model": model
          }
        self.wfile.write(bytes(json.dumps(obj), "utf-8"))

if __name__ == "__main__":        
    parser = argparse.ArgumentParser(
      prog = 'Embedding\'s service')
    
    # 1024, sentence-transformers/all-roberta-large-v1
    # 386, sentence-transformers/all-MiniLM-L6-v2
    parser.add_argument('--model', default="sentence-transformers/all-MiniLM-L6-v2")
    parser.add_argument('--host', default="0.0.0.0")
    parser.add_argument('--device', default='cpu')
    parser.add_argument('--port', default=4070)      # option that takes a value

    args = parser.parse_args()

    hostName = args.host
    serverPort = args.port
    device = args.device
    model = args.model
    
    print('loading model:', model, ' on device:', device)

    emb = embeddings.EmbeddingService(model, device)

    webServer = HTTPServer((hostName, serverPort), partial(EmbeddingsServer, emb), bind_and_activate=False)
    webServer.allow_reuse_address = True
    webServer.daemon_threads = True

    webServer.server_bind()
    webServer.server_activate()
    print("Embedding started http://%s:%s" % (hostName, serverPort))

    try:
        webServer.serve_forever()
    except KeyboardInterrupt:
        pass

    webServer.server_close()
    print("Server stopped.")