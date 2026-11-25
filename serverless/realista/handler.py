"""Trabalhador serverless do RunPod para a "foto realista" do EME Spatial.

Não traz modelos nem ComfyUI na imagem: usa a instalação que já existe no volume de rede
mfcreate_01 (a mesma dos Pods), montada em /runpod-volume. Entrada no formato do worker-comfyui:
  {"input": {"workflow": {...grafo da API do ComfyUI...}, "images": [{"name": "vista.jpg", "image": "<base64>"}]}}
Saída: {"images": [{"filename": "...", "type": "base64", "data": "<base64>"}]}
"""
import base64, json, os, subprocess, time, urllib.request, uuid

import runpod

VOL = os.environ.get("COMFY_ROOT", "/runpod-volume/runpod-slim/ComfyUI")
PORT = 8188
URL = f"http://127.0.0.1:{PORT}"
_proc = None


def _python():
    for cand in [os.environ.get("COMFY_PYTHON", ""), f"{VOL}/.venv/bin/python", f"{VOL}/../.venv/bin/python", f"{VOL}/venv/bin/python"]:
        if cand and os.path.exists(cand):
            return cand
    return "python3"


def _start():
    global _proc
    if _proc and _proc.poll() is None:
        return
    _proc = subprocess.Popen([_python(), "main.py", "--listen", "127.0.0.1", "--port", str(PORT), "--disable-auto-launch"], cwd=VOL)
    for _ in range(600):
        try:
            urllib.request.urlopen(URL + "/system_stats", timeout=2)
            return
        except Exception:
            time.sleep(1)
    raise RuntimeError("ComfyUI não subiu em 10 minutos")


def _post(path, body):
    req = urllib.request.Request(URL + path, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())


def _upload(name, b64):
    data = base64.b64decode(b64.split(",")[-1])
    boundary = uuid.uuid4().hex
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{name}\"\r\nContent-Type: image/jpeg\r\n\r\n").encode() + data + \
           (f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--{boundary}--\r\n").encode()
    req = urllib.request.Request(URL + "/upload/image", data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    urllib.request.urlopen(req, timeout=60).read()


def handler(job):
    inp = job.get("input") or {}
    workflow = inp.get("workflow")
    if not isinstance(workflow, dict):
        return {"error": "faltou o workflow"}
    _start()
    for img in inp.get("images") or []:
        _upload(img["name"], img["image"])
    prompt_id = _post("/prompt", {"prompt": workflow, "client_id": job.get("id", "eme")})["prompt_id"]
    deadline = time.time() + 600
    while time.time() < deadline:
        hist = json.loads(urllib.request.urlopen(f"{URL}/history/{prompt_id}", timeout=30).read())
        if prompt_id in hist:
            entry = hist[prompt_id]
            status = entry.get("status", {})
            if status.get("status_str") == "error":
                return {"error": "erro no ComfyUI", "detalhe": status.get("messages", [])[-3:]}
            out = []
            for node in entry.get("outputs", {}).values():
                for im in node.get("images", []):
                    if im.get("type") != "output":
                        continue
                    path = os.path.join(VOL, "output", im.get("subfolder", ""), im["filename"])
                    with open(path, "rb") as f:
                        out.append({"filename": im["filename"], "type": "base64", "data": base64.b64encode(f.read()).decode()})
                    try:
                        os.remove(path)  # não acumular arquivos no volume (ele já encheu uma vez)
                    except OSError:
                        pass
            if out:
                return {"images": out}
        time.sleep(1)
    return {"error": "tempo esgotado"}


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
