// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * CUPR — Reserva Soberana Bitcopper
 * Supply fijo: 29,000,000 (número atómico Cu=29)
 * Generación 1: 2026-2029
 * Solo el owner (Bitcopper Railway) puede mintear
 */
contract CUPR is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 29_000_000 * 10**18;
    uint256 public constant MAX_DAILY_MINT = 26_484 * 10**18;

    // Generación
    uint8 public generation = 1;
    uint256 public gen1_start = 1740787200; // 2026-03-01 UTC
    uint256 public gen1_end   = 1866556800; // 2029-02-28 UTC

    // Control diario
    mapping(uint256 => uint256) public dailyMinted; // dia => cantidad

    // Registro burns
    event BurnMint(
        address indexed wallet,
        uint256 bitcu_burned,   // en microunidades (×10^6)
        uint256 cupr_minted,
        bytes32 tx_hash,
        uint8 gen
    );

    constructor(address initialOwner)
        ERC20("Bitcopper Reserve", "CUPR")
        Ownable(initialOwner)
    {}

    /**
     * Mintear CUPR cuando se quema BITCU en la red Bitcopper
     * Solo callable por el owner (servidor Railway via backend)
     */
    function mintFromBurn(
        address to,
        uint256 amount,
        uint256 bitcu_burned,
        bytes32 tx_hash
    ) external onlyOwner {
        require(block.timestamp >= gen1_start, "Gen1 no iniciada");
        require(block.timestamp <= gen1_end,   "Gen1 finalizada");
        require(totalSupply() + amount <= MAX_SUPPLY, "Supply Gen1 agotado");

        // Control cupo diario
        uint256 today = block.timestamp / 1 days;
        require(dailyMinted[today] + amount <= MAX_DAILY_MINT, "Cupo diario agotado");
        dailyMinted[today] += amount;

        _mint(to, amount);
        emit BurnMint(to, bitcu_burned, amount, tx_hash, generation);
    }

    /**
     * Ver cuánto queda disponible hoy
     */
    function dailyAvailable() external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        uint256 minted = dailyMinted[today];
        return minted >= MAX_DAILY_MINT ? 0 : MAX_DAILY_MINT - minted;
    }

    /**
     * % del supply emitido
     */
    function supplyPct() external view returns (uint256) {
        return (totalSupply() * 10000) / MAX_SUPPLY; // basis points
    }

    // No hay burn() — CUPR no se destruye, es reserva soberana
    // No hay transfer restrictions — libre circulación en DEX
}
