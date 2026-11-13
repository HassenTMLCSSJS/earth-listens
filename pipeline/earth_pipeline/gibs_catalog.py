"""GIBS layer identifiers confirmed on 2026-11-13.

The PRD names are search hints. Each id below is an ``ows:Identifier`` in
``https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml``
retrieved that day. Colormap URLs are the v1.3 Metadata links on that Layer.
"""

from __future__ import annotations

CAPABILITIES_URL = "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml"
CONFIRMED_ON = "2026-11-13"

# id, colormap (v1.3), time extent copied from the capabilities Dimension.
CONFIRMED: dict[str, dict[str, str]] = {
    "temperature": {
        "id": "MERRA2_2m_Air_Temperature_Monthly",
        "colormap": "https://gibs.earthdata.nasa.gov/colormaps/v1.3/MERRA2_2m_Air_Temperature_Monthly.xml",
        "time": "1980-01-01/2023-11-01/P1M; 2024-02-01/2024-04-01/P1M; 2024-06-01/2026-08-01/P1M",
    },
    "sea_ice": {
        "id": "AMSRU2_Sea_Ice_Concentration_12km",
        "colormap": "https://gibs.earthdata.nasa.gov/colormaps/v1.3/AMSR_Sea_Ice_Concentration.xml",
        "time": "2012-07-02/2025-09-01/P1D",
    },
    "forest_height": {
        "id": "GEDI_ISS_L3_Canopy_Height_Mean_RH100_201904-202303",
        "colormap": "https://gibs.earthdata.nasa.gov/colormaps/v1.3/GEDI_RH100_Mean_Color_Index.xml",
        "time": "2019-04-18/2019-04-18/P1429D",
    },
    "forest_stddev": {
        "id": "GEDI_ISS_L3_Canopy_Height_StdDev_RH100_201904-202303",
        "colormap": "https://gibs.earthdata.nasa.gov/colormaps/v1.3/GEDI_RH100_Stddev_Color_Index.xml",
        "time": "2019-04-18/2019-04-18/P1429D",
    },
    "forest_biomass": {
        "id": "GEDI_ISS_L4B_Aboveground_Biomass_Density_Mean_201904-202303",
        "colormap": "https://gibs.earthdata.nasa.gov/colormaps/v1.3/GEDI_MU_Color_Index.xml",
        "time": "2019-04-18/2019-04-18/P1429D",
    },
    "precipitation": {
        "id": "IMERG_Precipitation_Rate",
        "colormap": "https://gibs.earthdata.nasa.gov/colormaps/v1.3/GPM_Precipitation_Rate.xml",
        "time": "2000-06-01/2025-10-22/P1D and later daily segments through 2026-11-12",
    },
    "co2": {
        "id": "AIRS_L3_Carbon_Dioxide_AIRS_AMSU_Monthly",
        "colormap": "https://gibs.earthdata.nasa.gov/colormaps/v1.3/AIRS_Carbon_Dioxide_AIRS_AMSU_Monthly.xml",
        "time": "2002-09-01/2012-02-01/P1M",
    },
    "aerosols": {
        "id": "MERRA2_Aerosol_Optical_Depth_Analysis_Monthly",
        "colormap": "https://gibs.earthdata.nasa.gov/colormaps/v1.3/MERRA2_Aerosol_Optical_Depth_Analysis_Monthly.xml",
        "time": "1980-01-01/2026-08-01/P1M",
    },
    "dust": {
        "id": "MERRA2_Dust_Surface_Mass_Concentration_PM25_Monthly",
        "colormap": "https://gibs.earthdata.nasa.gov/colormaps/v1.3/MERRA2_Dust_Surface_Mass_Concentration_PM25_Monthly.xml",
        "time": "1980-01-01/2026-08-01/P1M",
    },
    "lightning": {
        "id": "LIS_ISS_Flash_Count",
        "colormap": "https://gibs.earthdata.nasa.gov/colormaps/v1.3/LIS_ISS_Flash_Count.xml",
        "time": "2017-03-01/2021-09-29/P1D with gaps",
    },
    "lightning_radiance": {
        "id": "LIS_ISS_Flash_Radiance",
        "colormap": "https://gibs.earthdata.nasa.gov/colormaps/v1.3/LIS_ISS_Flash_Radiance.xml",
        "time": "2017-03-01/2021-09-29/P1D with gaps",
    },
    "ocean_sst": {
        "id": "GHRSST_L4_MUR_Sea_Surface_Temperature",
        "colormap": "https://gibs.earthdata.nasa.gov/colormaps/v1.3/GHRSST_Sea_Surface_Temperature.xml",
        "time": "2002-06-01/2026-11-12/P1D with gaps",
    },
}
