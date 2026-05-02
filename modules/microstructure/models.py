from dataclasses import dataclass


@dataclass
class PriceLevel:
    price: float
    quantity: float

    def __eq__(self, other):
        return self.price == other.price

    def __lt__(self, other):
        return self.price < other.price