import {
    getCleanTerm,
    buildRipgrepPattern,
    extractDefinitionContent,
    determinePrefixToUse,
    buildExistingDefPattern,
} from "../rustdocLinkDefs"

describe("rustdocLinkDefs utilities", () => {
    describe("getCleanTerm", () => {
        it("strips backticks and brackets", () => {
            expect(getCleanTerm("[`SIGWINCH`]")).toBe("SIGWINCH")
            expect(getCleanTerm("[SIGWINCH]")).toBe("SIGWINCH")
            expect(getCleanTerm("`SIGWINCH`")).toBe("SIGWINCH")
            expect(getCleanTerm("SIGWINCH")).toBe("SIGWINCH")
        })
    })

    describe("buildRipgrepPattern", () => {
        it("escapes characters and builds a correct ripgrep regex", () => {
            const pattern = buildRipgrepPattern("SIGWINCH")
            expect(pattern).toBe("^\\s*(///|//!)\\s*\\[`?SIGWINCH`?\\]:\\s*(.+)")
        })

        it("handles terms with special regex characters", () => {
            const pattern = buildRipgrepPattern("Option::Some")
            // Since `.` is not in Option::Some, let's use a dot
            const patternWithDot = buildRipgrepPattern("std::fs::File")
            expect(patternWithDot).toBe(
                "^\\s*(///|//!)\\s*\\[`?std::fs::File`?\\]:\\s*(.+)",
            )

            const patternSpecial = buildRipgrepPattern("vec![1,2]")
            expect(patternSpecial).toBe(
                "^\\s*(///|//!)\\s*\\[`?vec!\\[1,2\\]`?\\]:\\s*(.+)",
            )
        })
    })

    describe("buildExistingDefPattern", () => {
        it("matches existing definitions exactly", () => {
            const regex = buildExistingDefPattern("SIGWINCH")

            // Should match these
            expect(regex.test("/// [`SIGWINCH`]: something")).toBe(true)
            expect(regex.test("  //! [SIGWINCH]: something")).toBe(true)
            expect(regex.test("///[`SIGWINCH`]: something")).toBe(true)

            // Should not match these
            expect(regex.test("/// [`OTHER`]: something")).toBe(false)
            expect(regex.test("/// SIGWINCH is cool")).toBe(false)
            expect(regex.test("// [`SIGWINCH`]: something")).toBe(false) // regular comment
        })

        it("handles special characters in the term", () => {
            const regex = buildExistingDefPattern("Option::Some")
            expect(regex.test("/// [`Option::Some`]: link")).toBe(true)
        })
    })

    describe("extractDefinitionContent", () => {
        it("removes mod-level rustdoc prefix", () => {
            expect(extractDefinitionContent("//! [`SIGWINCH`]: https://man7.org/")).toBe(
                "[`SIGWINCH`]: https://man7.org/",
            )
            expect(extractDefinitionContent("  //! [`SIGWINCH`]: something")).toBe(
                "[`SIGWINCH`]: something",
            )
        })

        it("removes item-level rustdoc prefix", () => {
            expect(
                extractDefinitionContent(
                    "/// [`ANSI`]: https://en.wikipedia.org/wiki/ANSI_escape_code",
                ),
            ).toBe("[`ANSI`]: https://en.wikipedia.org/wiki/ANSI_escape_code")
            expect(extractDefinitionContent("  /// [`ANSI`]: link")).toBe(
                "[`ANSI`]: link",
            )
        })
    })

    describe("determinePrefixToUse", () => {
        it("uses prefix from the last line if available", () => {
            expect(determinePrefixToUse("//! some text", "module")).toBe("//! ")
            expect(determinePrefixToUse("  /// some text", "item")).toBe("  /// ")
            expect(determinePrefixToUse("\t/// some text", "item")).toBe("\t/// ")
        })

        it("falls back to default prefix based on blockType if no match", () => {
            expect(determinePrefixToUse("some invalid line", "module")).toBe("//! ")
            expect(determinePrefixToUse("some invalid line", "item")).toBe("/// ")
        })
    })
})
