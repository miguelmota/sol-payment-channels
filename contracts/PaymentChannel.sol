pragma solidity ^0.4.24;

import "./SafeMath.sol";

/// a sender can open a channel with a receiver
contract PaymentChannel {
  using SafeMath for uint256;

  struct Channel {
    uint256 amount;
    uint256 timeout;
    bool closed;
    address sender; // eg. customer
    address receiver; // eg. merchant
  }

  mapping(address => Channel) public senders;
  mapping(bytes32 => address) public signatures;

  event LogOpen(address indexed sender, address indexed receiver, uint256 timeout, uint256 amount);
  event LogClose(address indexed sender, address indexed receiver);

  /// sender calls open() sending eth amount, receiver address, and timeout till channel closes
  function open(address _receiver, uint256 _timeout) public payable {
    require(senders[msg.sender].closed == false);
    senders[msg.sender].amount = msg.value;
    senders[msg.sender].timeout = _timeout;
    senders[msg.sender].sender = msg.sender;
    senders[msg.sender].receiver = _receiver;
    emit LogOpen(msg.sender, _receiver, _timeout, msg.value);
  }

  /// either sender or receiver calls close() sending final amount, sender address, and signature.
  /// the sender should sign the hashed amount.
  function close(bytes32 _hash, bytes32 _r, bytes32 _s, uint8 _v, address _sender, uint256 _amount) public {
    require(senders[_sender].amount >= _amount);
    require(senders[_sender].closed == false);

    // NOTE: prefixed message is required for testrpc
    address signer = ecrecover(_hash, _v, _r, _s);
    require(signer == _sender);

    bytes memory prefix = "\x19Ethereum Signed Message:\n32";
    bytes32 proof = keccak256(abi.encodePacked(this, _amount));
    bytes32 prefixedProof = keccak256(abi.encodePacked(prefix, proof));
    // NOTE: can this be improved for checking testrpc signed hashes?
    require(proof == _hash || prefixedProof == _hash);

    // TODO: ability to re-open channel
    require(signatures[proof] == 0);
    signatures[proof] = signer;

    // receiver can withdraw signed message amount before timeout
    if (senders[_sender].timeout <= now && signer == senders[_sender].receiver) {
      senders[_sender].amount = senders[_sender].amount.sub(_amount);
      _sender.transfer(_amount);
    }

    // sender can withdraw unspent amount after timeout
    if (senders[_sender].timeout > now && signer == _sender) {
      _sender.transfer(senders[_sender].amount);
      senders[_sender].amount = 0;
    }

    // close channel if funds are exhausted
    if (senders[_sender].timeout > now && senders[_sender].amount == 0) {
      senders[_sender].closed = true;
      emit LogClose(senders[_sender].sender, senders[_sender].receiver);
    }
  }
}
