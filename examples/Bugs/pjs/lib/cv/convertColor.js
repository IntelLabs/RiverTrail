function dotCellsEF(ind,v) {
  var total=0;
  for (var i=0;i<v.length;i++) {
    total+=this.get(ind).get(i)*v[i];
  }
  return total;
}
function convertColorImageToGrayscale(img) {
  return img.combine(2,dotCellsEF,[0.299,0.587,0.114]);
}
function convertColorImageToUnitGrayscale(img) {
  return img.combine(2,dotCellsEF,[0.299/255,0.587/255,0.114/255]);
}
function convertGrayImageToColor(img) {
  return img.combine(2,function(i){var c=this.get(i);return [c,c,c,255];});
}
