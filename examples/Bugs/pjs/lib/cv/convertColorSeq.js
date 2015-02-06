function convertColorImageToGrayscaleSeq(colorImage,grayImage) {
  if (colorImage.data.length!=grayImage.data.length*4) throw "colorImage must be same size (with RGBA) as grayImage"
  for (var i=0;i<grayImage.data.length;i++) {
    grayImage.data[i]=colorImage.data[i*4]*0.299+colorImage.data[i*4+1]*0.587+colorImage.data[i*4+2]*0.114;
  }
}
function convertGrayImageToColorSeq(grayImage,colorImage) {
  if (colorImage.data.length!=grayImage.data.length*4) throw "colorImage must be same size (with RGBA) as grayImage"
  for (var i=0;i<grayImage.data.length;i++) {
    colorImage.data[i*4]=colorImage.data[i*4+1]=colorImage.data[i*4+2]=grayImage.data[i];
    colorImage.data[i*4+3]=255;
  }
}
