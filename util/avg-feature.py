import sys
import os.path
import json

def printAvg(propName, lines, total):
    print("[{0} lines] Avg. number of {1}: {2}".format(lines, propName, round(total/lines)))

def printStats(lines, props, numericProps, literalProps, vertices):
    printAvg("properties", lines, props)
    printAvg("numeric propertiers", lines, numericProps)
    printAvg("literal properties", lines, literalProps)
    printAvg("vertices", lines, vertices)
    print("-------")

args = sys.argv[1:]

if len(args) < 1 or len(args) > 1:
    print("Pass 1 argument to specify the input GeoJSONL file.")
    exit(1)

inputFilePath = args[0]
if os.path.exists(inputFilePath):
    inputFile = open(inputFilePath)
    lines = inputFile.readlines()
    count = 0
    props = 0
    numericProps = 0
    literalProps = 0
    vertices = 0
    for line in lines:
        count += 1
        feature = json.loads(line)
        featureProps = feature["properties"]
        props += len(featureProps)
        for propValue in featureProps.values():
            if isinstance(propValue, str):
                literalProps += 1
            else:
                numericProps += 1
        featureVerticesCollection = feature['geometry']["coordinates"]
        for featureVertices in featureVerticesCollection:
            vertices += len(featureVertices)
        if count % 1000 == 0:
            printStats(count, props, numericProps, literalProps, vertices)
    print("--- RESULT ---")
    printStats(count, props, numericProps, literalProps, vertices)