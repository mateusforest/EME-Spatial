"""Visual camera registration against the parcel in Aporte's aerial film.
This is a photographic study, not a measured architectural/survey placement.
Requires opencv-python-headless, numpy. Source image coordinates are 1920x1080.
"""
import cv2,json,math,numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
# Estimated rectangular portion of the plot (model metres) and image pixels.
world=np.array([[-8.575,0,21.39],[9.065,0,21.39],[-8.575,0,-46.23],[8.575,0,-46.92]],np.float64)
pixels=np.array([[1196,944],[1262,831],[693,798],[803,719]],np.float64)
fov=48;f=540/math.tan(math.radians(fov/2));K=np.array([[f,0,960],[0,f,540],[0,0,1]],np.float64)
ok,rv,tv=cv2.solvePnP(world,pixels,K,None,flags=cv2.SOLVEPNP_ITERATIVE)
assert ok
R,_=cv2.Rodrigues(rv);position=(-R.T@tv).ravel();rotation=R.T@np.diag([1,-1,-1])
projected,_=cv2.projectPoints(world,rv,tv,K,None);error=np.linalg.norm(projected[:,0]-pixels,axis=1)
data={'width':1920,'height':1080,'fov':fov,'position':position.tolist(),'rotation':rotation.tolist(),
 'controlWorld':world.tolist(),'controlPixels':pixels.tolist(),'residualPixels':error.tolist(),
 'focus':[.59,.67],'source':'https://aporteconstrutora.com.br/APO_VAC_FILME_EF.mp4','frameSeconds':2.5,
 'description':'Fotograma real do filme da Aporte, com tratamento por IA para retirar texto e brilho promocional. Encaixe visual aproximado; não é levantamento topográfico.',
 'imageEdit':'Removed promotional text and glowing parcel outline using built-in image generation; original frame retained for comparison.',
 'cameraStatus':'visual approximation; parcel dimensions estimated from the original model'}
(ROOT/'src/apogeu/aerial-camera.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'public/assets/apogeu/aerial/source.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('Position:',position,'Residual:',error)
