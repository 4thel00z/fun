#include "root.h"
#include "headers-handwritten.h"
#include <JavaScriptCore/RegularExpression.h>
#include <JavaScriptCore/Options.h>

using namespace JSC;
using namespace JSC::Yarr;

extern "C" RegularExpression* Yarr__RegularExpression__init(FunString pattern, uint16_t flags)
{
    // TODO: Remove this, we technically are accessing options before we finalize them.
    // This means you cannot use FUN_JSC_dumpCompiledRegExpPatterns on the flag passed to `fun test -t`
    // NOLINTBEGIN
    Options::AllowUnfinalizedAccessScope scope {};
    // NOLINTEND
    return new RegularExpression(pattern.toWTFString(FunString::ZeroCopy), OptionSet<Flags>(static_cast<Flags>(flags)));
}
extern "C" void Yarr__RegularExpression__deinit(RegularExpression* re)
{
    delete re;
}
extern "C" bool Yarr__RegularExpression__isValid(RegularExpression* re)
{
    return re->isValid();
}
extern "C" int Yarr__RegularExpression__matchedLength(RegularExpression* re)
{
    return re->matchedLength();
}
extern "C" int Yarr__RegularExpression__searchRev(RegularExpression* re, FunString string)
{
    return re->searchRev(string.toWTFString(FunString::ZeroCopy));
}
// extern "C" int Yarr__RegularExpression__match(RegularExpression* re, FunString string, int32_t start, int32_t* matchLength)
// {
//     return re->match(string.toWTFString(FunString::ZeroCopy), start, matchLength);
// }
extern "C" int Yarr__RegularExpression__matches(RegularExpression* re, FunString string)
{
    return re->match(string.toWTFString(FunString::ZeroCopy), 0, 0);
}
