#!/bin/bash
d=$1
cat <<EOF
    <script type="text/javascript" src="$d/PAUtils.js"> </script>
    <script type="text/javascript" src="$d/resizeImage.js"> </script>
    <script type="text/javascript" src="$d/convertColor.js"> </script>
    <script type="text/javascript" src="$d/convolution.js"> </script>
    <script type="text/javascript" src="$d/timer.js"> </script>
    <script type="text/javascript" src="$d/OpticalFlowFarneback.js"> </script>
    <script type="text/javascript" src="$d/DenseOpticalFlowManager.js"> </script>
    <script type="text/javascript" src="$d/ImageManager.js"></script>
    <script type="text/javascript" src="$d/DotsManager.js"> </script>

    <script type="text/javascript" src="$d/JSArray.js"></script>
    <script type="text/javascript" src="$d/convertColorSeq.js"></script>
    <script type="text/javascript" src="$d/resizeImageSeq.js"></script>
    <script type="text/javascript" src="$d/convolutionSeq.js"></script>
    <script type="text/javascript" src="$d/OpticalFlowFarnebackSeq.js"></script>
    <script type="text/javascript" src="$d/DenseOpticalFlowManagerSeq.js"></script>
EOF
