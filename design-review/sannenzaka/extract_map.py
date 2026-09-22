"""OSM-derived centerlines and nearby building anchors; elevations are authored."""
import xml.etree.ElementTree as E,json,math,gzip
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
r=E.fromstring(gzip.decompress((Path(__file__).resolve().parent/'source.osm.xml.gz').read_bytes()))
ns={n.get('id'):(float(n.get('lon')),float(n.get('lat'))) for n in r.findall('node')}
S=.7;origin=(135.7808045,34.9979977)
def xy(p):return [(p[0]-origin[0])*91188*S,-(p[1]-origin[1])*111320*S]
def tags(w):return {t.get('k'):t.get('v') for t in w.findall('tag')}
ways={w.get('id'):w for w in r.findall('way')}
# y endpoints define an artistic, continuous elevation profile in scene metres.
spec=[('30913263',0,1.6),('30882783',1.6,4.32),('550360170',4.32,4.5),('526198271',7.2,4.5),('179116810',14.56,7.2),('1251544286',14.6,14.56),('710696944',-.4,4.5)]
roads=[]
for id,a,b in spec:
 w=ways[id];ps=[xy(ns[n.get('ref')]) for n in w.findall('nd')];ls=[0]
 for p,q in zip(ps,ps[1:]):ls.append(ls[-1]+math.dist(p,q))
 t=tags(w);roads.append(dict(id=id,name=t['name'],kind=t['highway'],steps=int(t.get('step_count',0)),width=4.2,points=[[p[0],a+(b-a)*d/ls[-1],p[1]] for p,d in zip(ps,ls)]))
# Short Kiyomizu-zaka landing at the southern arrival, clipped from actual coordinates.
w=ways['28514434'];ps=[xy(ns[n.get('ref')]) for n in w.findall('nd')][:3]
roads.append(dict(id='28514434',name='清水坂',kind='pedestrian',steps=0,width=4.8,points=[[p[0],14.6,p[1]] for p in ps]))
def nearest(p):
 best=None
 for ri,road in enumerate(roads):
  for a,b in zip(road['points'],road['points'][1:]):
   dx,dz=b[0]-a[0],b[2]-a[2];t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[2])*dz)/(dx*dx+dz*dz)));q=[a[0]+t*dx,a[1]+t*(b[1]-a[1]),a[2]+t*dz];d=math.hypot(q[0]-p[0],q[2]-p[1])
   if best is None or d<best[0]:best=(d,q,ri,(dx,dz))
 return best
buildings=[]
for id,w in ways.items():
 t=tags(w)
 if 'building'not in t or id=='371717416':continue
 ps=[xy(ns[n.get('ref')]) for n in w.findall('nd') if n.get('ref')in ns]
 if len(ps)<4:continue
 ps=ps[:-1];c=[sum(p[i] for p in ps)/len(ps) for i in range(2)];dist,anchor,ri,tangent=nearest(c)
 if dist>17 or dist<3.7:continue
 # Orient to the polygon's minimum area rectangle, choose the closest face to the street.
 rects=[]
 for a,b in zip(ps,ps[1:]+ps[:1]):
  ang=math.atan2(b[1]-a[1],b[0]-a[0]);co,si=math.cos(ang),math.sin(ang);us=[p[0]*co+p[1]*si for p in ps];vs=[-p[0]*si+p[1]*co for p in ps];u0,u1,v0,v1=min(us),max(us),min(vs),max(vs)
  rects.append(((u1-u0)*(v1-v0),ang,u0,u1,v0,v1))
 _,ang,u0,u1,v0,v1=min(rects);co,si=math.cos(ang),math.sin(ang);c=[(u0+u1)/2*co-(v0+v1)/2*si,(u0+u1)/2*si+(v0+v1)/2*co];w0,d0=u1-u0,v1-v0
 if min(w0,d0)<2.6 or max(w0,d0)>24:continue
 candidates=[]
 for da,ww,dd in [(0,w0,d0),(math.pi,w0,d0),(math.pi/2,d0,w0),(-math.pi/2,d0,w0)]:
  a=ang+da;f=[-math.sin(a),math.cos(a)];front=[c[0]+f[0]*dd/2,c[1]+f[1]*dd/2];nd=nearest(front);candidates.append((nd[0],a,ww,dd,nd,front))
 gap,ang,ww,dd,near,front=min(candidates)
 if gap<1.95: # slight contraction prevents enlarged pedestrian paving entering walls.
  dd=max(2.7,dd-2*(1.95-gap));front=[c[0]-math.sin(ang)*dd/2,c[1]+math.cos(ang)*dd/2];near=nearest(front)
 buildings.append(dict(osmId=id,center=[c[0],near[1][1],c[1]],yaw=-ang,width=ww*.96,depth=dd*.96,footprint=ps,road=near[2],streetPoint=near[1],doorFront=front))
# Use mapped building position for the pagoda.
pagoda=[xy(ns[n.get('ref')]) for n in ways['371717416'].findall('nd')][:-1]
pc=[sum(p[i] for p in pagoda)/4 for i in range(2)]
data=dict(source='https://www.openstreetmap.org/api/0.6/map?bbox=135.7778,34.9958,135.7830,35.0003',attribution='© OpenStreetMap contributors',license='ODbL 1.0',origin=origin,horizontalScale=S,elevation='Authored; not survey data. OSM 17 / 46 step counts preserved.',roads=roads,buildings=buildings,pagoda=[pc[0],-.2,pc[1]],bounds=[min(p[i] for road in roads for p in road['points']) for i in [0,2]]+[max(p[i] for road in roads for p in road['points']) for i in [0,2]])
(ROOT/'dist/assets/sannenzaka/map.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print('roads',len(roads),'buildings',len(buildings),'bounds',data['bounds'],'pagoda',data['pagoda'])
