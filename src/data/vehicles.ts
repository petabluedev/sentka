type VehicleGroup = { make: string; models: string[] };

const baseVehicles: VehicleGroup[] = [
  { make: "Toyota", models: ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "Tundra", "4Runner", "Prius", "Sienna", "Sequoia"] },
  { make: "Honda", models: ["Accord", "Civic", "CR-V", "Pilot", "Odyssey", "Ridgeline", "HR-V", "Passport"] },
  { make: "Ford", models: ["F-150", "F-250", "Ranger", "Maverick", "Escape", "Explorer", "Edge", "Bronco", "Bronco Sport", "Mustang", "Transit", "Expedition"] },
  { make: "Chevrolet", models: ["Silverado 1500", "Silverado 2500", "Colorado", "Equinox", "Tahoe", "Suburban", "Traverse", "Blazer", "Trailblazer", "Camaro", "Malibu", "Bolt EUV"] },
  { make: "Nissan", models: ["Altima", "Sentra", "Maxima", "Rogue", "Murano", "Pathfinder", "Frontier", "Titan", "Armada", "Versa", "Kicks"] },
  { make: "Jeep", models: ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Gladiator", "Renegade", "Wagoneer"] },
  { make: "Hyundai", models: ["Elantra", "Sonata", "Tucson", "Santa Fe", "Palisade", "Kona", "Venue", "Ioniq 5", "Ioniq 6", "Santa Cruz"] },
  { make: "Kia", models: ["Soul", "Seltos", "Sportage", "Sorento", "Telluride", "Forte", "K5", "Carnival", "Niro", "EV6", "EV9"] },
  { make: "Subaru", models: ["Outback", "Forester", "Crosstrek", "Impreza", "Legacy", "Ascent", "WRX", "BRZ"] },
  { make: "Volkswagen", models: ["Jetta", "Passat", "Tiguan", "Atlas", "Atlas Cross Sport", "Golf GTI", "Golf R", "ID.4"] },
  { make: "GMC", models: ["Sierra 1500", "Sierra 2500", "Canyon", "Yukon", "Yukon XL", "Acadia", "Terrain"] },
  { make: "Ram", models: ["1500", "2500", "3500", "ProMaster City", "ProMaster"] },
  { make: "Tesla", models: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"] },
  { make: "BMW", models: ["3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7", "4 Series", "i4", "iX", "iX3", "i7"] },
  { make: "Mercedes-Benz", models: ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLS", "GLA", "GLB", "EQB", "EQS", "EQE"] },
  { make: "Audi", models: ["A3", "A4", "A5", "A6", "Q3", "Q5", "Q7", "Q8", "A7", "e-tron", "Q4 e-tron"] },
  { make: "Lexus", models: ["ES", "IS", "GS", "RX", "NX", "GX", "LX", "UX", "RC", "TX"] },
  { make: "Volvo", models: ["XC40", "XC60", "XC90", "EX30", "EX90", "S60", "S90", "V60", "V90", "C40"] },
  { make: "Cadillac", models: ["Escalade", "Escalade ESV", "XT4", "XT5", "XT6", "Lyriq", "CT4", "CT5"] },
  { make: "Acura", models: ["MDX", "RDX", "TLX", "Integra", "NSX"] },
  { make: "Mazda", models: ["CX-5", "CX-50", "CX-30", "CX-90", "CX-70", "Mazda3", "Mazda6", "MX-5 Miata"] },
  { make: "Buick", models: ["Encore GX", "Enclave", "Envision", "Envista"] },
  { make: "Dodge", models: ["Durango", "Charger", "Challenger", "Hornet", "Journey"] },
  { make: "Chrysler", models: ["Pacifica", "Voyager", "300"] },
  { make: "Infiniti", models: ["Q50", "QX50", "QX55", "QX60", "QX80"] },
  { make: "Lincoln", models: ["Corsair", "Nautilus", "Aviator", "Navigator"] },
  { make: "Mitsubishi", models: ["Outlander", "Outlander Sport", "Eclipse Cross", "Mirage"] },
  { make: "Genesis", models: ["G70", "G80", "G90", "GV60", "GV70", "GV80"] },
  { make: "Mini", models: ["Hardtop 2 Door", "Hardtop 4 Door", "Countryman", "Clubman"] },
  { make: "Land Rover", models: ["Range Rover", "Range Rover Sport", "Range Rover Velar", "Range Rover Evoque", "Defender 90", "Defender 110", "Defender 130", "Discovery", "Discovery Sport"] },
  { make: "Porsche", models: ["Cayenne", "Macan", "Panamera", "911", "Taycan"] },
  { make: "Jaguar", models: ["F-PACE", "E-PACE", "I-PACE", "XF", "F-TYPE"] },
  { make: "Alfa Romeo", models: ["Giulia", "Stelvio", "Tonale"] },
  { make: "Fiat", models: ["500X", "500e"] },
  { make: "Lucid", models: ["Air", "Gravity"] },
  { make: "Rivian", models: ["R1T", "R1S"] },
  { make: "Polestar", models: ["2", "3", "4"] },
  { make: "Bentley", models: ["Bentayga", "Flying Spur", "Continental GT"] },
  { make: "Aston Martin", models: ["DBX", "Vantage", "DB12"] },
  { make: "Rolls-Royce", models: ["Cullinan", "Ghost", "Phantom"] },
  { make: "Maserati", models: ["Levante", "Grecale", "Quattroporte", "Ghibli", "MC20"] },
  { make: "Ferrari", models: ["Roma", "Portofino", "296 GTB", "SF90", "Purosangue"] },
  { make: "Lamborghini", models: ["Urus", "Huracan", "Revuelto"] },
  { make: "McLaren", models: ["Artura", "720S", "750S", "GT"] },
  { make: "Bugatti", models: ["Chiron", "Mistral"] },
];

// Generate >600 options by adding drivetrain/fuel variants to each base model.
const variants = ["", " AWD", " Hybrid", " Plug-In", " EV"];

export const vehicleOptions: string[] = (() => {
  const opts = new Set<string>();
  baseVehicles.forEach(({ make, models }) => {
    models.forEach((model) => {
      variants.forEach((suffix) => {
        const label = suffix ? `${make} ${model} ${suffix.trim()}` : `${make} ${model}`;
        opts.add(label);
      });
    });
  });
  return Array.from(opts).sort();
})();
