# Use a MESMA imagem do template do Pod (ComfyUI "runpod-slim"), para o Python bater com o ambiente
# virtual que está no volume. Veja o nome da imagem na página do Pod no RunPod e passe em BASE.
ARG BASE=runpod/comfyui:latest
FROM ${BASE}
RUN pip install --no-cache-dir runpod==1.7.*
COPY handler.py /handler.py
ENV COMFY_ROOT=/runpod-volume/runpod-slim/ComfyUI
CMD ["python3", "-u", "/handler.py"]
