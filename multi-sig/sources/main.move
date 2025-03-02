module owner::main{

    use std::vector;
    use std::signer;
    use std::ed25519;

    const EINVALID_SIGNATURE: u64 = 1001;
    const EINVALID_VECTOR_LENGTH: u64 = 1002;

    /// Struct to hold one or multiple admin public keys
    struct AdminSigner has key, drop {
        signer_keys: vector<vector<u8>> // List of admin public keys
    }

    /// Initializes an AdminSigner with a list of public keys
    /// This function is intended to be called only once to set up authorized signers.
    ///
    /// # Parameters
    /// - `admin`: The signer of this transaction.
    /// - `admin_public_keys`: A vector of public keys to store for multi-signature verification.
    public entry fun add_public_key(
        admin: &signer, admin_public_keys: vector<vector<u8>>
    ) {
         (admin, AdminSigner { signer_keys: admin_public_keys });
    }

    /// Verifies multiple signatures against stored admin public keys.
    /// Each signature in `signatures` must correspond to the public key at the same index in `admin_public_keys`.
    /// Returns true if all signatures are valid; otherwise, returns false.
    ///
    /// # Parameters
    /// - `message_hash`: The hash of the message that was signed.
    /// - `signatures`: A vector of Ed25519 signatures to verify.
    /// - `admin`: The address containing the AdminSigner with authorized keys.
    ///
    /// # Returns
    /// - `true` if all signatures are valid; otherwise, `false`.
    #[view]
    public fun verify_multiple_signatures(
        owner: address, message_hash: vector<u8>, signatures: vector<vector<u8>>
    ): bool acquires AdminSigner {
        // Retrieve the stored admin public keys.
        let admin_signer = borrow_global<AdminSigner>(owner);
        let admin_public_keys = admin_signer.signer_keys;

        // Check if the number of provided signatures matches the number of stored public keys.
        let num_keys = vector::length(&admin_public_keys);
        let num_signatures = vector::length(&signatures);

        assert!(num_keys != num_signatures, EINVALID_VECTOR_LENGTH);

        // Loop through each public key and signature pair to verify
        let x = 0;
        while (x < num_keys) {
            let signature = vector::borrow(&signatures, x);
            let public_key = vector::borrow(&admin_public_keys, x);

            // Convert signature and public key to Ed25519-compatible types
            let signature_ed = ed25519::new_signature_from_bytes(*signature);
            let public_key_ed =
                ed25519::new_unvalidated_public_key_from_bytes(*public_key);

            // Verify the signature with the corresponding public key and message hash
            let is_valid =
                ed25519::signature_verify_strict(
                    &signature_ed, &public_key_ed, message_hash
                );

            if (!is_valid) {
                return false // Return false if any signature is invalid
            };

            x = x + 1;
        };

        // All signatures are valid if we reach this point
        true
    }

    /// Verifies a single signature against the public key.
    /// This function is useful for single-signature verification.
    ///
    /// # Parameters
    /// - `message_hash`: The hash of the message that was signed.
    /// - `signature`: The Ed25519 signature to verify.
    /// - `public_key`: The public key of wallet used to sign the message.
    ///
    /// # Returns
    /// - `true` if the signature is valid; otherwise, `false`.
    #[view]
    public fun verify_signature(
        message_hash: vector<u8>,
        signature: vector<u8>,
        public_key: vector<u8>,
        _data: u64
    ): bool {

        // Convert signature and public key to Ed25519-compatible types
        let signature_ed = ed25519::new_signature_from_bytes(signature);
        let public_key_ed = ed25519::new_unvalidated_public_key_from_bytes(public_key);

        // Verify the signature with the public key and message hash
        let is_valid =
            ed25519::signature_verify_strict(&signature_ed, &public_key_ed, message_hash);

        is_valid
    }

    /// Executes a multi-signature transaction, verifying signatures from multiple accounts.
    /// This is an example function that demonstrates how multiple accounts can be required for a transaction.
    ///
    /// # Parameters
    /// - `acc1`: First signer's account.
    /// - `acc2`: Second signer's account.
    /// - `acc3`: Third signer's account.
    /// - `data`: The transaction data for demonstration purposes.
    public entry fun multi_sig_trans(
        acc_vector: vector<signer>,
        _data: u64
    ) {
        // This function can be extended with specific logic for a multi-signature transaction.
        // For instance, it can include verifying each account's signature on a given message hash
        // before allowing any further state changes.

        // You can add here assert!() to make sure tha the signature
        // are only from a specific account address.
        // And can proceed further accordingly.
    }
}
