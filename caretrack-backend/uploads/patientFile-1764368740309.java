public class Assignment6 {
    /*
    public static void main(String[] args) {
        // Instantiate planes using type inheritance
        Plane concorde1 = new Concorde(5000, 100);
        Plane boeing1 = new Boeing(4000, 200);
        Plane mig1 = new MiG(6000);
        Plane tomcat1 = new TomCat(7000);

        // Uncommenting the following lines should cause compilation errors
        // because abstract classes cannot be instantiated
        // Plane plane = new Plane(3000);
        // PassengerPlane passengerPlane = new PassengerPlane(3500, 150);
        // FighterPlane fighterPlane = new FighterPlane(4000);

        // Create Fleet
        Fleet fleet = new Fleet();

        // Add planes to fleet
        fleet.addPlane(concorde1);
        fleet.addPlane(boeing1);
        fleet.addPlane(mig1);
        fleet.addPlane(tomcat1);

        // Add more planes to fleet using type inheritance
        Plane concorde2 = new Concorde(5500, 110);
        Plane boeing2 = new Boeing(4200, 180);
        Plane mig2 = new MiG(6200);
        Plane tomcat2 = new TomCat(7100);

        fleet.addPlane(concorde2);
        fleet.addPlane(boeing2);
        fleet.addPlane(mig2);
        fleet.addPlane(tomcat2);

        // Demonstrate fleet functionalities

        // Retrieve and display the plane with the highest engine power
        Plane strongestPlane = fleet.getStrongestPlane();
        if (strongestPlane != null) {
            System.out.println("Strongest Plane ID: " + strongestPlane.getPlaneID() +
                    ", Engine Power: " + strongestPlane.getTotalEnginePower());
            if(strongestPlane instanceof PassengerPlane) {
                System.out.println("Strongest plane is a passanger plane");
            } else if(strongestPlane instanceof FighterPlane) {
                System.out.println("Strongest plane is a fighter plane");
            }
            strongestPlane.takeOff();
            strongestPlane.fly();
            strongestPlane.land();
        }

         // Calculate and display the total passenger capacity of the fleet
        int totalCapacity = fleet.getTotalPassengerCapacity();
        System.out.println("Total Passenger Capacity of the Fleet: " + totalCapacity);


        // Retrieve fighter planes from the fleet and demonstrate their functionalities
        for(int i=0; i < 6; i++) {
            FighterPlane fighterPlane = fleet.getFighterPlane(i);
            if (fighterPlane != null) {
                fighterPlane.takeOff();
                fighterPlane.fly();
                fighterPlane.launchMissile();
                if (fighterPlane instanceof MiG) {
                    ((MiG) fighterPlane).highSpeedGeometry();
                } else if (fighterPlane instanceof TomCat) {
                    ((TomCat) fighterPlane).refuel();
                }
                fighterPlane.land();
            } else {
                System.out.println("No fighter plane at index " + i);
            }
        }

    }

     */
}

class Plane {
    private static int idCounter = 0;
    private int planeID;
    private int enginePower;

    public Plane(int enginePower) {
        this.enginePower = enginePower;
        planeID = ++idCounter;
    }

    public String getPlaneID() {
        return Integer.toString(planeID);
    }

    public int getTotalEnginePower() {
        return enginePower;
    }

    public void takeOff() {
        System.out.println("Plane " + getPlaneID() + " takeOff");
    }

    public void land() {
        System.out.println("Plane " + getPlaneID() + " land");
    }

    public void fly() {
        System.out.println("Plane " + getPlaneID() + " fly");
    }
}

class PassengerPlane extends Plane {
    private int maxPassengers;

    public PassengerPlane(int enginePower, int maxPassengers) {
        super(enginePower);
        this.maxPassengers = maxPassengers;
    }

    public int getMaxPassengers() {
        return maxPassengers;
    }
}

class Concorde extends PassengerPlane {
    public Concorde(int enginePower, int maxPassengers) {
        super(enginePower, maxPassengers);
    }

    public void goSuperSonic() {
        System.out.println("Plane " + getPlaneID() + " Supersonic mode activated");
    }

    public void goSubSonic() {
        System.out.println("Plane " + getPlaneID() + " Supersonic mode deactivated");
    }
}

class Boeing extends PassengerPlane {
    public Boeing(int enginePower, int maxPassengers) {
        super(enginePower, maxPassengers);
    }
}

class FighterPlane extends Plane {
    public FighterPlane(int enginePower) {
        super(enginePower);
    }

    public void launchMissile() {
        System.out.println("Plane " + getPlaneID() + " Launching rocket");
    }
}

class MiG extends FighterPlane {
    public MiG(int enginePower) {
        super(enginePower);
    }

    public void highSpeedGeometry() {
        System.out.println("Plane " + getPlaneID() + " High speed selected geometry");
    }

    public void normalGeometry() {
        System.out.println("Plane " + getPlaneID() + " Normal selected geometry");
    }
}

class TomCat extends FighterPlane {
    public TomCat(int enginePower) {
        super(enginePower);
    }

    public void refuel() {
        System.out.println("Plane " + getPlaneID() + " TomCat - Refuelling");
    }
}

class Fleet {
   // Implement the Fleet class here

}
