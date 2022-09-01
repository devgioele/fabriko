import matplotlib.pyplot as plt
import numpy as np

def mean(list):
    return sum(durations) / len(durations)

def median(list):
    n = len(list)
    if n == 0:
        raise Exception("The median is undefined for empty lists.")
    if n % 2 == 1:
        return list[n//2]
    return (list[n//2-1] + list[n//2]) / 2

figure = plt.figure(figsize=(10.5, 9))
figure.tight_layout() # pad=0, w_pad=0, h_pad=0
subplots = [
    figure.add_subplot(2, 2, 1, projection='3d'),
    figure.add_subplot(2, 2, 2, projection='3d'),
    figure.add_subplot(2, 2, (3, 4), projection='3d')
]

# DATA
# x = number raster files
# y = number vector files
# z = 0 for all (touch the ground)
# w = execution duration in seconds
# The number of roles is visualized by drawing multiple plots
data = [
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
]]

durations = []

# Generate a plot for each role
for index, rolesMatrix in enumerate(data):
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
            dz.append(w)
            durations.append(w)
    # Let each bar touch the ground
    z = np.zeros_like(x)
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
    subplot.set_zlim((0, 400))
    subplot.view_init(15, -66)
    subplot.set_title('Roles: ' + str(roles), y=0.97)
    subplot.set_xlabel('Raster files')
    subplot.set_ylabel('Vector files')
    subplot.set_zlabel('Duration [s]')

# Statistics
print("Arithmetic mean of duration = " + str(mean(durations)) + "s")
print("Median of duration = " + str(median(durations)) + "s")

plt.savefig(fname="benchmark.png", dpi=400)
plt.show()