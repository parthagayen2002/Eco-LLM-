import time

import psutil


class EnergyTracker:
    def __init__(self):
        self._start_time = None
        self._start_cpu = None

    def start(self):
        self._start_time = time.time()
        self._start_cpu = psutil.cpu_percent(interval=None)

    def stop(self):
        if self._start_time is None:
            return {"latency": 0.0, "energy": 0.0}

        latency = time.time() - self._start_time
        cpu_usage = psutil.cpu_percent(interval=None)
        baseline = self._start_cpu or 0.0
        energy = max((cpu_usage + baseline) / 2, 0.0) * latency * 0.0001
        return {"latency": round(latency, 2), "energy": round(energy, 4)}
