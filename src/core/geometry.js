export const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

export function centerOf(el, relativeRect) {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width/2 - relativeRect.left,
    y: r.top  + r.height/2 - relativeRect.top
  };
}

export function segmentDist(ax,ay,bx,by,cx,cy,dx,dy) {
  const denom = (ax-bx)*(cy-dy)-(ay-by)*(cx-dx);
  if (Math.abs(denom)>1e-5) {
    const t=((ax-cx)*(cy-dy)-(ay-cy)*(cx-dx))/denom;
    const u=-((ax-bx)*(ay-cy)-(ay-by)*(ax-cx))/denom;
    if (t>=0&&t<=1&&u>=0&&u<=1) return 0;
  }
  return Math.min(
    pointSeg(ax,ay,cx,cy,dx,dy),
    pointSeg(bx,by,cx,cy,dx,dy),
    pointSeg(cx,cy,ax,ay,bx,by),
    pointSeg(dx,dy,ax,ay,bx,by)
  );
}

export function pointSeg(px,py,ax,ay,bx,by){
  const dx=bx-ax, dy=by-ay, L=dx*dx+dy*dy;
  if (!L) return Math.hypot(px-ax,py-ay);
  let t=((px-ax)*dx+(py-ay)*dy)/L;
  t=clamp(t,0,1);
  const x=ax+t*dx, y=ay+t*dy;
  return Math.hypot(px-x,py-y);
}

export function bezierSamples(p0,p1,p2,n=40){
  const arr=[];
  for(let i=0;i<=n;i++){
    const t=i/n, u=1-t;
    arr.push({
      x: u*u*p0.x + 2*u*t*p1.x + t*t*p2.x,
      y: u*u*p0.y + 2*u*t*p1.y + t*t*p2.y
    });
  }
  return arr;
}