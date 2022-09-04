import matplotlib.pyplot as plt
import numpy as np
import sys

def mean(list):
    return sum(durations) / len(durations)

def median(list):
    n = len(list)
    if n == 0:
        raise Exception("The median is undefined for empty lists.")
    if n % 2 == 1:
        return list[n//2]
    return (list[n//2-1] + list[n//2]) / 2

# How distant a is from b, in percentages relative to b
def distance(a, b):
    return (a - b) / b * 100

def flattenIteration(iteration):
    durations = []
    # Collect durations to get minimum
    for rolesMatrix in iteration:
        for rasterArray in rolesMatrix:
            for duration in rasterArray:
                durations.append(duration)
    return durations

def genFigure(iteration, durationTitle, durationMin, durationMax):
    plt.rc('font', size=14)
    fig = plt.figure(figsize=(8.5, 7))
    fig.tight_layout()
    nrows = 2
    ncols = 2
    subplots = [
        fig.add_subplot(nrows, ncols, 1, projection='3d'),
        fig.add_subplot(nrows, ncols, 2, projection='3d'),
        fig.add_subplot(nrows, ncols, (3, 4), projection='3d')
    ]
    durationOffset = 15
    # Generate a plot for each role
    for index, rolesMatrix in enumerate(iteration):
        roles = index + 1
        subplot = subplots[index]
        # Force axes to use integers
        subplot.xaxis.get_major_locator().set_params(integer=True)
        subplot.yaxis.get_major_locator().set_params(integer=True)
        subplot.zaxis.get_major_locator().set_params(integer=True)
        # Take data
        # - number of raster files
        x = np.repeat(np.arange(1, 4), len(rolesMatrix))
        # - number of vector files
        y = np.resize(np.arange(1, 4), len(rolesMatrix) * len(rolesMatrix[0]))
        # - execution duration in seconds
        dz = []
        for rasterArray in rolesMatrix:
            for w in rasterArray:
                dz.append(w-durationMin+durationOffset)
        # Let each bar touch the ground
        z = np.repeat(durationMin-durationOffset, len(x))
        # Make each bar smaller such that there is space in between
        dx = dy = 1/2 * np.ones_like(z)
        # Shift each bar such that it is centered
        x = [e - 1/4 for e in x]
        y = [e - 1/4 for e in y]
        # The first 6 arguments of the method 'bar3d' mean:
        # x coordinates of each bar
        # y coordinates of each bar
        # z coordinates of each bar
        # width of each bar
        # depth of each bar
        # height of each bar
        subplot.bar3d(x, y, z, dx, dy, dz, shade=True, color='#008233')
        subplot.set_zlim(zmin=durationMin-durationOffset, zmax=durationMax)
        # subplot.view_init(15, -66)
        subplot.view_init(14, -81)
        subplot.set_title('Roles: ' + str(roles), y=0.95)
        subplot.set_xlabel('Raster files')
        subplot.set_ylabel('Vector files')
        subplot.set_zlabel(durationTitle)
        newLines = durationTitle.count("\n")
        labelpad = 15 * newLines if newLines > 0 else 10
        subplot.zaxis.labelpad = labelpad
    fig.subplots_adjust(left=-0.08, bottom=0, right=1, top=1, wspace=0, hspace=0)
    return fig

# DATA
# x = number raster files
# y = number vector files
# z = 0 for all (touch the ground)
# w = execution duration in seconds
# The number of roles is visualized by drawing multiple plots
data = [
# benchmark iteration 1
[
# roles: 1    
[
    # raster files: 1
    [129, 159, 158],
    # raster files: 2
    [127, 334, 154],
    # raster files: 3
    [143, 160, 131]
], 
# roles: 2
[
    # raster files: 1
    [138, 370, 162],
    # raster files: 2
    [129, 149, 156],
    # raster files: 3
    [144, 156, 181]
],
# roles: 3
[
    # raster files: 1
    [159, 172, 165],
    # raster files: 2
    [157, 152, 169],
    # raster files: 3
    [152, 155, 166]
]],
# benchmark iteration 2
[
# roles: 1    
[
    # raster files: 1
    [138, 205, 162],
    # raster files: 2
    [140, 157, 146],
    # raster files: 3
    [183, 191, 165]
], 
# roles: 2
[
    # raster files: 1
    [167, 193, 156],
    # raster files: 2
    [185, 167, 182],
    # raster files: 3
    [191, 148, 155]
],
# roles: 3
[
    # raster files: 1
    [163, 208, 173],
    # raster files: 2
    [141, 176, 182],
    # raster files: 3
    [155, 175, 198]
]]]

# Generate a figure that takes the mean of all iterations
meanIteration = np.zeros_like(data[0])
for i in range(0, len(data)):
    iteration = data[i]
    for indexRoles, rolesMatrix in enumerate(iteration):
        for indexRaster, rasterArray in enumerate(rolesMatrix):
            for indexVector, duration in enumerate(rasterArray):
                meanIteration[indexRoles][indexRaster][indexVector] += duration/len(data)
durationsMean = flattenIteration(meanIteration)
durationMinMean = min(durationsMean)
durationMaxMean = max(durationsMean)
fig = genFigure(meanIteration, 'Arithmetic mean\nof duration [s]', durationMinMean, durationMaxMean)
fig.savefig(fname="benchmark.svg")
fig.savefig(fname="benchmark.pdf")

# Collect durations and compute min and max
durations = []
for iteration in data:
    durations.extend(flattenIteration(iteration))
durationMin = min(durations)
durationMax = max(durations)

# Generate a figure for each benchmark iteration
for index, iteration in enumerate(data):
    fig = genFigure(iteration, 'Duration [s]', durationMin, durationMax)
    # Save figure
    name = "benchmark-iteration-" + str(index+1)
    fig.savefig(fname= name + ".svg")
    fig.savefig(fname= name + ".pdf")

# Statistics
def roundStats(v):
    return round(v, 2)
print("-- Statistics about duration --")
mean = mean(durations)
print("Arithmetic mean = {}s".format(roundStats(mean)))
print("Min = {}s = {:+}%".format(roundStats(durationMin), roundStats(distance(durationMin, mean))))
print("Max = {}s = {:+}%".format(roundStats(durationMax), roundStats(distance(durationMax, mean))))

plt.show()