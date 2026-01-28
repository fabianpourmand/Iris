import json
import os
import sys
import tempfile
import threading
import time
import unittest
from http.client import HTTPConnection
from http.server import HTTPServer

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT_DIR)

import server as iris_server


class IrisIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = HTTPServer(("127.0.0.1", 0), iris_server.Handler)
        cls.port = cls.httpd.server_address[1]
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        time.sleep(0.2)

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def post_json(self, path, payload):
        conn = HTTPConnection("127.0.0.1", self.port, timeout=5)
        body = json.dumps(payload).encode("utf-8")
        conn.request(
            "POST", path, body=body, headers={"Content-Type": "application/json"}
        )
        response = conn.getresponse()
        data = response.read().decode("utf-8")
        conn.close()
        return response.status, data

    def test_tools_roundtrip(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            status, data = self.post_json(
                "/api/tools/execute",
                {
                    "tool": "write_file",
                    "path": "sample.txt",
                    "content": "hello",
                    "root": temp_dir,
                },
            )
            self.assertEqual(status, 200)
            payload = json.loads(data)
            self.assertTrue(payload.get("success"))

            status, data = self.post_json(
                "/api/tools/execute",
                {"tool": "read_file", "path": "sample.txt", "root": temp_dir},
            )
            payload = json.loads(data)
            self.assertTrue(payload.get("success"))
            self.assertEqual(payload["result"]["content"], "hello")

            expected = iris_server.hashlib.sha256("hello".encode("utf-8")).hexdigest()
            status, data = self.post_json(
                "/api/tools/execute",
                {
                    "tool": "edit_file",
                    "path": "sample.txt",
                    "content": "hello world",
                    "expected_sha256": expected,
                    "root": temp_dir,
                },
            )
            payload = json.loads(data)
            self.assertTrue(payload.get("success"))

            status, data = self.post_json(
                "/api/tools/execute",
                {"tool": "delete_file", "path": "sample.txt", "root": temp_dir},
            )
            payload = json.loads(data)
            self.assertTrue(payload.get("success"))

    def test_denylist_blocks(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            os.makedirs(os.path.join(temp_dir, ".git"), exist_ok=True)
            status, data = self.post_json(
                "/api/tools/execute",
                {"tool": "list_dir", "path": ".git", "root": temp_dir},
            )
            self.assertEqual(status, 400)
            payload = json.loads(data)
            self.assertFalse(payload.get("success"))

    def test_chat_specialized(self):
        status, body = self.post_json(
            "/api/chat",
            {
                "message": "signal mirror",
                "category": "survival",
                "messages": [{"role": "user", "content": "signal mirror"}],
            },
        )
        self.assertEqual(status, 200)
        self.assertIn("SIGNALING FOR RESCUE", body)


if __name__ == "__main__":
    unittest.main()
